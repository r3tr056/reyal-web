-- Secure order retrieval with permission checks
CREATE OR REPLACE FUNCTION get_order_with_permissions(
  p_order_id UUID,
  p_user_id UUID
) RETURNS JSON AS $$
DECLARE
  v_order RECORD;
  v_profile RECORD;
  v_permissions JSON;
  v_result JSON;
BEGIN
  -- Get user profile and permissions
  SELECT * INTO v_profile
  FROM profiles
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION SQLSTATE 'P0002' USING MESSAGE = 'User not found';
  END IF;
  
  -- Get order with all related data
  SELECT o.*, 
    COALESCE(
      JSON_AGG(
        JSON_BUILD_OBJECT(
          'id', oi.id,
          'quantity', oi.quantity,
          'unit_price', oi.unit_price,
          'total_price', oi.total_price,
          'quotes', JSON_BUILD_OBJECT(
            'id', q.id,
            'title', q.title,
            'files', JSON_BUILD_OBJECT(
              'original_filename', f.original_filename,
              'file_type', f.file_type,
              'thumbnail_url', f.thumbnail_url,
              'file_size', f.file_size
            )
          )
        )
      ) FILTER (WHERE oi.id IS NOT NULL), '[]'
    ) as order_items,
    COALESCE(
      JSON_AGG(DISTINCT
        JSON_BUILD_OBJECT(
          'id', oh.id,
          'status', oh.status,
          'message', oh.message,
          'created_at', oh.created_at,
          'created_by', oh.created_by,
          'metadata', oh.metadata
        )
      ) FILTER (WHERE oh.id IS NOT NULL), '[]'
    ) as order_history
  INTO v_order
  FROM orders o
  LEFT JOIN order_items oi ON o.id = oi.order_id
  LEFT JOIN quotes q ON oi.quote_id = q.id
  LEFT JOIN files f ON q.file_id = f.id
  LEFT JOIN order_history oh ON o.id = oh.order_id
  WHERE o.id = p_order_id
  GROUP BY o.id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION SQLSTATE 'P0001' USING MESSAGE = 'Order not found';
  END IF;
  
  -- Check access permissions
  IF v_order.user_id != p_user_id AND NOT v_profile.is_admin THEN
    RAISE EXCEPTION SQLSTATE 'P0002' USING MESSAGE = 'Access denied';
  END IF;
  
  -- Build permissions object
  v_permissions := JSON_BUILD_OBJECT(
    'can_view_financial', v_profile.is_admin OR v_order.user_id = p_user_id,
    'can_view_sensitive', v_profile.is_admin,
    'can_view_details', v_profile.is_admin OR v_order.user_id = p_user_id,
    'can_modify', v_profile.is_admin,
    'is_admin', v_profile.is_admin,
    'is_owner', v_order.user_id = p_user_id
  );
  
  -- Get additional financial data if permitted
  IF v_profile.is_admin OR v_order.user_id = p_user_id THEN
    -- Add invoices, payments, refunds
    SELECT COALESCE(JSON_AGG(i.*), '[]') INTO v_order.invoices
    FROM invoices i WHERE i.order_id = p_order_id;
    
    SELECT COALESCE(JSON_AGG(p.*), '[]') INTO v_order.payments
    FROM payments p WHERE p.order_id = p_order_id;
    
    SELECT COALESCE(JSON_AGG(r.*), '[]') INTO v_order.refunds
    FROM refunds r WHERE r.order_id = p_order_id;
    
    IF v_profile.is_admin THEN
      SELECT COALESCE(JSON_AGG(ae.*), '[]') INTO v_order.accounting_entries
      FROM accounting_entries ae 
      WHERE ae.reference_id = p_order_id AND ae.reference_type = 'order';
    END IF;
  END IF;
  
  -- Build final result
  v_result := JSON_BUILD_OBJECT(
    'order', ROW_TO_JSON(v_order),
    'permissions', v_permissions
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Secure atomic order update function
CREATE OR REPLACE FUNCTION update_order_secure(
  p_order_id UUID,
  p_updates JSONB,
  p_admin_id UUID,
  p_audit_context JSONB,
  p_request_id TEXT
) RETURNS JSONB AS $$
DECLARE
  v_current_order RECORD;
  v_updated_order RECORD;
  v_previous_values JSONB;
  v_actions_performed JSONB DEFAULT '{}';
  v_financial_updates BOOLEAN DEFAULT FALSE;
  v_calculated_total DECIMAL;
BEGIN
  -- Start serializable transaction for data consistency
  SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
  
  -- Lock and get current order
  SELECT * INTO v_current_order
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION SQLSTATE 'P0001' USING MESSAGE = 'Order not found';
  END IF;
  
  -- Store previous values for audit
  v_previous_values := TO_JSONB(v_current_order);
  
  -- Validate business rules
  PERFORM validate_order_update_rules(v_current_order, p_updates, p_admin_id);
  
  -- Calculate new total if financial fields are updated
  IF p_updates ? 'discount_amount' OR p_updates ? 'shipping_amount' THEN
    v_calculated_total := COALESCE((p_updates->>'discount_amount')::DECIMAL, v_current_order.discount_amount, 0);
    v_calculated_total := v_current_order.subtotal_amount + v_current_order.tax_amount - v_calculated_total + 
                         COALESCE((p_updates->>'shipping_amount')::DECIMAL, v_current_order.shipping_amount, 0);
    v_financial_updates := TRUE;
  END IF;
  
  -- Perform the update
  UPDATE orders SET
    status = COALESCE((p_updates->>'status')::VARCHAR, status),
    payment_status = COALESCE((p_updates->>'payment_status')::VARCHAR, payment_status),
    notes = COALESCE(p_updates->>'notes', notes),
    business_notes = COALESCE(p_updates->>'business_notes', business_notes),
    internal_notes = COALESCE(p_updates->>'internal_notes', internal_notes),
    discount_amount = COALESCE((p_updates->>'discount_amount')::DECIMAL, discount_amount),
    shipping_amount = COALESCE((p_updates->>'shipping_amount')::DECIMAL, shipping_amount),
    total_amount = COALESCE(v_calculated_total, total_amount),
    updated_at = NOW(),
    updated_by = p_admin_id
  WHERE id = p_order_id
  RETURNING * INTO v_updated_order;
  
  -- Handle status-specific business logic
  IF (p_updates->>'status') = 'confirmed' AND v_current_order.status != 'confirmed' THEN
    v_actions_performed := v_actions_performed || '{"invoice_generated": true}';
    PERFORM generate_invoice_for_order(p_order_id, p_admin_id);
  END IF;
  
  IF (p_updates->>'payment_status') = 'paid' AND v_current_order.payment_status != 'paid' THEN
    v_actions_performed := v_actions_performed || '{"payment_recorded": true}';
    PERFORM record_payment_for_order(p_order_id, v_updated_order.total_amount, p_admin_id);
  END IF;
  
  -- Insert comprehensive audit log
  INSERT INTO audit_logs (
    action,
    table_name,
    record_id,
    user_id,
    old_values,
    new_values,
    ip_address,
    user_agent,
    metadata
  ) VALUES (
    'ORDER_UPDATE',
    'orders',
    p_order_id,
    p_admin_id,
    v_previous_values,
    TO_JSONB(v_updated_order),
    p_audit_context->>'ipAddress',
    p_audit_context->>'userAgent',
    JSONB_BUILD_OBJECT(
      'request_id', p_request_id,
      'actions_performed', v_actions_performed,
      'financial_updates', v_financial_updates
    )
  );
  
  -- Add order history entry
  INSERT INTO order_history (
    order_id,
    status,
    message,
    created_by,
    metadata
  ) VALUES (
    p_order_id,
    v_updated_order.status,
    format('Order updated by admin %s', (SELECT email FROM profiles WHERE id = p_admin_id)),
    p_admin_id,
    JSONB_BUILD_OBJECT('changes', p_updates, 'request_id', p_request_id)
  );
  
  -- Return comprehensive result
  RETURN JSONB_BUILD_OBJECT(
    'updated_order', TO_JSONB(v_updated_order),
    'previous_values', v_previous_values,
    'actions_performed', v_actions_performed,
    'financial_summary', calculate_order_financial_summary(p_order_id)
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log error for monitoring
    INSERT INTO error_logs (
      error_code,
      error_message,
      context,
      user_id,
      created_at
    ) VALUES (
      SQLSTATE,
      SQLERRM,
      JSONB_BUILD_OBJECT(
        'function', 'update_order_secure',
        'order_id', p_order_id,
        'updates', p_updates,
        'request_id', p_request_id
      ),
      p_admin_id,
      NOW()
    );
    
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Business rule validation function
CREATE OR REPLACE FUNCTION validate_order_update_rules(
  p_current_order RECORD,
  p_updates JSONB,
  p_admin_id UUID
) RETURNS VOID AS $$
BEGIN
  -- Validate discount amount
  IF p_updates ? 'discount_amount' THEN
    IF (p_updates->>'discount_amount')::DECIMAL > p_current_order.subtotal_amount THEN
      RAISE EXCEPTION SQLSTATE 'P0003' USING MESSAGE = 'Discount cannot exceed subtotal amount';
    END IF;
    
    IF (p_updates->>'discount_amount')::DECIMAL > p_current_order.subtotal_amount * 0.5 THEN
      -- Check if admin has high discount authorization
      IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_admin_id AND jsonb_extract_path_text(permissions, 'high_discount') = 'true') THEN
        RAISE EXCEPTION SQLSTATE 'P0003' USING MESSAGE = 'Discount exceeds authorization limit';
      END IF;
    END IF;
  END IF;
  
  -- Validate status transitions
  IF p_updates ? 'status' THEN
    IF NOT is_valid_status_transition(p_current_order.status, p_updates->>'status') THEN
      RAISE EXCEPTION SQLSTATE 'P0003' USING MESSAGE = format('Invalid status transition: %s to %s', 
        p_current_order.status, p_updates->>'status');
    END IF;
  END IF;
  
  -- Validate payment status consistency
  IF p_updates ? 'payment_status' AND (p_updates->>'payment_status') = 'paid' THEN
    IF NOT EXISTS (
      SELECT 1 FROM payments 
      WHERE order_id = p_current_order.id 
      AND status = 'completed' 
      AND amount >= p_current_order.total_amount
    ) THEN
      RAISE EXCEPTION SQLSTATE 'P0003' USING MESSAGE = 'Cannot mark as paid: insufficient payment records';
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;


-- Secure paginated orders retrieval
CREATE OR REPLACE FUNCTION get_user_orders_paginated(
  p_user_id UUID,
  p_limit INTEGER,
  p_offset INTEGER,
  p_status_filter TEXT DEFAULT NULL,
  p_payment_status_filter TEXT DEFAULT NULL,
  p_sort_by TEXT DEFAULT 'created_at',
  p_sort_order TEXT DEFAULT 'desc'
) RETURNS JSON AS $$
DECLARE
  v_orders JSONB;
  v_total_count INTEGER;
  v_query TEXT;
  v_count_query TEXT;
BEGIN
  -- Validate sort parameters to prevent SQL injection
  IF p_sort_by NOT IN ('created_at', 'updated_at', 'total_amount') THEN
    p_sort_by := 'created_at';
  END IF;
  
  IF p_sort_order NOT IN ('asc', 'desc') THEN
    p_sort_order := 'desc';
  END IF;
  
  -- Build base query
  v_query := '
    SELECT 
      o.*,
      COALESCE(
        JSON_AGG(
          JSON_BUILD_OBJECT(
            ''id'', oi.id,
            ''quantity'', oi.quantity,
            ''unit_price'', oi.unit_price,
            ''total_price'', oi.total_price,
            ''status'', oi.status
          )
        ) FILTER (WHERE oi.id IS NOT NULL), 
        ''[]''
      ) as order_items,
      COALESCE(
        JSON_AGG(DISTINCT
          JSON_BUILD_OBJECT(
            ''id'', i.id,
            ''invoice_number'', i.invoice_number,
            ''status'', i.status,
            ''total_amount'', i.total_amount,
            ''created_at'', i.created_at
          )
        ) FILTER (WHERE i.id IS NOT NULL), 
        ''[]''
      ) as invoices,
      COALESCE(
        JSON_AGG(DISTINCT
          JSON_BUILD_OBJECT(
            ''id'', p.id,
            ''payment_number'', p.payment_number,
            ''amount'', p.amount,
            ''method'', p.method,
            ''status'', p.status,
            ''created_at'', p.created_at
          )
        ) FILTER (WHERE p.id IS NOT NULL), 
        ''[]''
      ) as payments
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    LEFT JOIN invoices i ON o.id = i.order_id
    LEFT JOIN payments p ON o.id = p.order_id
    WHERE o.user_id = $1';
  
  -- Add filters
  IF p_status_filter IS NOT NULL THEN
    v_query := v_query || ' AND o.status = $' || (CASE WHEN p_payment_status_filter IS NULL THEN '2' ELSE '3' END);
  END IF;
  
  IF p_payment_status_filter IS NOT NULL THEN
    v_query := v_query || ' AND o.payment_status = $' || (CASE WHEN p_status_filter IS NULL THEN '2' ELSE '4' END);
  END IF;
  
  -- Group by and order
  v_query := v_query || '
    GROUP BY o.id
    ORDER BY o.' || p_sort_by || ' ' || p_sort_order || '
    LIMIT $' || (CASE 
      WHEN p_status_filter IS NULL AND p_payment_status_filter IS NULL THEN '2'
      WHEN p_status_filter IS NOT NULL AND p_payment_status_filter IS NULL THEN '3'
      WHEN p_status_filter IS NULL AND p_payment_status_filter IS NOT NULL THEN '3'
      ELSE '5'
    END) || ' OFFSET $' || (CASE 
      WHEN p_status_filter IS NULL AND p_payment_status_filter IS NULL THEN '3'
      WHEN p_status_filter IS NOT NULL AND p_payment_status_filter IS NULL THEN '4'
      WHEN p_status_filter IS NULL AND p_payment_status_filter IS NOT NULL THEN '4'
      ELSE '6'
    END);
  
  -- Execute query based on filters
  IF p_status_filter IS NOT NULL AND p_payment_status_filter IS NOT NULL THEN
    EXECUTE v_query INTO v_orders USING p_user_id, p_status_filter, p_payment_status_filter, p_limit, p_offset;
  ELSIF p_status_filter IS NOT NULL THEN
    EXECUTE v_query INTO v_orders USING p_user_id, p_status_filter, p_limit, p_offset;
  ELSIF p_payment_status_filter IS NOT NULL THEN
    EXECUTE v_query INTO v_orders USING p_user_id, p_payment_status_filter, p_limit, p_offset;
  ELSE
    EXECUTE v_query INTO v_orders USING p_user_id, p_limit, p_offset;
  END IF;
  
  -- Get total count
  v_count_query := 'SELECT COUNT(*) FROM orders WHERE user_id = $1';
  
  IF p_status_filter IS NOT NULL THEN
    v_count_query := v_count_query || ' AND status = $2';
    IF p_payment_status_filter IS NOT NULL THEN
      v_count_query := v_count_query || ' AND payment_status = $3';
      EXECUTE v_count_query INTO v_total_count USING p_user_id, p_status_filter, p_payment_status_filter;
    ELSE
      EXECUTE v_count_query INTO v_total_count USING p_user_id, p_status_filter;
    END IF;
  ELSIF p_payment_status_filter IS NOT NULL THEN
    v_count_query := v_count_query || ' AND payment_status = $2';
    EXECUTE v_count_query INTO v_total_count USING p_user_id, p_payment_status_filter;
  ELSE
    EXECUTE v_count_query INTO v_total_count USING p_user_id;
  END IF;
  
  -- Return result
  RETURN JSON_BUILD_OBJECT(
    'orders', COALESCE(v_orders, '[]'::jsonb),
    'total_count', v_total_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic order creation function
CREATE OR REPLACE FUNCTION create_order_atomic(
  p_user_id UUID,
  p_order_data JSONB,
  p_audit_context JSONB,
  p_request_id TEXT
) RETURNS JSONB AS $$
DECLARE
  v_cart_items RECORD[];
  v_order RECORD;
  v_order_items JSONB[];
  v_subtotal DECIMAL := 0;
  v_tax_amount DECIMAL := 0;
  v_shipping_cost DECIMAL := 0;
  v_total_amount DECIMAL := 0;
  v_order_number TEXT;
  v_financial_summary JSONB;
  v_delivery_groups JSONB;
  v_shipping_config RECORD;
BEGIN
  -- Start serializable transaction
  SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
  
  -- Get and validate cart items
  SELECT ARRAY(
    SELECT ROW(ci.*)
    FROM cart_items ci
    JOIN quotes q ON ci.quote_id = q.id
    JOIN files f ON q.file_id = f.id
    WHERE ci.user_id = p_user_id
    FOR UPDATE
  ) INTO v_cart_items;
  
  IF array_length(v_cart_items, 1) IS NULL OR array_length(v_cart_items, 1) = 0 THEN
    RAISE EXCEPTION SQLSTATE 'P0001' USING MESSAGE = 'Cart is empty';
  END IF;
  
  -- Calculate financial amounts with validation
  SELECT 
    SUM(q.total_cost * ci.quantity),
    JSON_AGG(
      JSON_BUILD_OBJECT(
        'quote_id', ci.quote_id,
        'quantity', ci.quantity,
        'unit_price', q.total_cost,
        'total_price', q.total_cost * ci.quantity,
        'settings', q.settings,
        'estimated_days', q.estimated_days
      )
    )
  INTO v_subtotal, v_order_items
  FROM unnest(v_cart_items) AS ci
  JOIN quotes q ON ci.quote_id = q.id;
  
  -- Validate order value
  IF v_subtotal > 1000000 THEN -- 1M limit
    RAISE EXCEPTION SQLSTATE 'P0003' USING MESSAGE = 'Order value exceeds maximum limit';
  END IF;
  
  IF v_subtotal < 1 THEN
    RAISE EXCEPTION SQLSTATE 'P0003' USING MESSAGE = 'Order value too low';
  END IF;
  
  -- Calculate tax (18% GST for India)
  v_tax_amount := v_subtotal * 0.18;
  
  -- Get shipping configuration
  SELECT * INTO v_shipping_config FROM shipping_config LIMIT 1;
  
  -- Calculate shipping cost
  SELECT calculate_shipping_cost(
    v_order_items::TEXT, 
    p_order_data->>'shipping_address',
    ROW_TO_JSON(v_shipping_config)::TEXT
  ) INTO v_shipping_cost;
  
  -- Calculate total
  v_total_amount := v_subtotal + v_tax_amount + v_shipping_cost;
  
  -- Generate secure order number
  v_order_number := generate_secure_order_number();
  
  -- Create order
  INSERT INTO orders (
    user_id,
    order_number,
    status,
    payment_status,
    payment_method,
    subtotal_amount,
    tax_amount,
    shipping_amount,
    total_amount,
    currency_code,
    exchange_rate,
    shipping_address,
    notes,
    customer_notes,
    estimated_delivery
  ) VALUES (
    p_user_id,
    v_order_number,
    'pending',
    'pending',
    p_order_data->>'payment_method',
    v_subtotal,
    v_tax_amount,
    v_shipping_cost,
    v_total_amount,
    COALESCE(p_order_data->>'currency_code', 'INR'),
    COALESCE((p_order_data->>'exchange_rate')::DECIMAL, 1.0),
    p_order_data->'shipping_address',
    p_order_data->>'notes',
    p_order_data->>'customer_notes',
    (NOW() + INTERVAL '7 days')
  )
  RETURNING * INTO v_order;
  
  -- Create order items
  INSERT INTO order_items (
    order_id,
    quote_id,
    quantity,
    unit_price,
    total_price,
    settings,
    status
  )
  SELECT 
    v_order.id,
    (item->>'quote_id')::UUID,
    (item->>'quantity')::INTEGER,
    (item->>'unit_price')::DECIMAL,
    (item->>'total_price')::DECIMAL,
    item->'settings',
    'pending'
  FROM jsonb_array_elements(v_order_items) AS item;
  
  -- Create accounting entries
  INSERT INTO accounting_entries (
    account_code,
    account_name,
    debit_amount,
    credit_amount,
    transaction_type,
    reference_id,
    reference_type,
    description,
    currency_code,
    exchange_rate
  ) VALUES
  (
    '1200', 'Accounts Receivable', v_total_amount, 0,
    'sale', v_order.id, 'order',
    'Order ' || v_order_number || ' - Accounts Receivable',
    v_order.currency_code, v_order.exchange_rate
  ),
  (
    '4000', 'Sales Revenue', 0, v_subtotal,
    'sale', v_order.id, 'order',
    'Order ' || v_order_number || ' - Sales Revenue',
    v_order.currency_code, v_order.exchange_rate
  ),
  (
    '2200', 'Output Tax (GST)', 0, v_tax_amount,
    'sale', v_order.id, 'order',
    'Order ' || v_order_number || ' - GST Output Tax',
    v_order.currency_code, v_order.exchange_rate
  );
  
  -- Clear cart
  DELETE FROM cart_items WHERE user_id = p_user_id;
  
  -- Create order history
  INSERT INTO order_history (
    order_id,
    status,
    message,
    created_by
  ) VALUES (
    v_order.id,
    'pending',
    'Order created and awaiting payment',
    p_user_id
  );
  
  -- Update customer balance
  INSERT INTO customer_balances (
    customer_id,
    current_balance,
    total_spent,
    last_order_date,
    last_updated
  ) VALUES (
    p_user_id,
    0,
    v_total_amount,
    NOW(),
    NOW()
  )
  ON CONFLICT (customer_id) DO UPDATE SET
    total_spent = customer_balances.total_spent + v_total_amount,
    last_order_date = NOW(),
    last_updated = NOW();
  
  -- Build financial summary
  v_financial_summary := json_build_object(
    'subtotal', v_subtotal::TEXT,
    'tax', v_tax_amount::TEXT,
    'shipping', v_shipping_cost::TEXT,
    'total', v_total_amount::TEXT
  );
  
  -- Return comprehensive result
  RETURN json_build_object(
    'order', row_to_json(v_order),
    'financial_summary', v_financial_summary,
    'order_items_count', array_length(v_cart_items, 1),
    'estimated_delivery_groups', '[]'::json
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log error
    INSERT INTO error_logs (
      error_code,
      error_message,
      context,
      user_id,
      created_at
    ) VALUES (
      SQLSTATE,
      SQLERRM,
      json_build_object(
        'function', 'create_order_atomic',
        'user_id', p_user_id,
        'request_id', p_request_id
      ),
      p_user_id,
      NOW()
    );
    
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate secure order number function
CREATE OR REPLACE FUNCTION generate_secure_order_number()
RETURNS TEXT AS $$
DECLARE
  v_date_string TEXT;
  v_timestamp TEXT;
  v_random TEXT;
BEGIN
  v_date_string := to_char(NOW(), 'YYYYMMDD');
  v_timestamp := upper(encode(int8send(extract(epoch from NOW())::bigint), 'base64'));
  v_random := upper(encode(gen_random_bytes(4), 'hex'));
  
  RETURN 'ORD' || v_date_string || '-' || v_timestamp || '-' || v_random;
END;
$$ LANGUAGE plpgsql;