-- Get estimate data for quote generation with security checks
CREATE OR REPLACE FUNCTION get_estimate_for_quote(
  p_estimate_id UUID,
  p_user_id UUID
) RETURNS JSON AS $$
DECLARE
  v_estimate RECORD;
  v_user_data RECORD;
  v_result JSON;
BEGIN
  -- Get estimate with all required data
  SELECT 
    e.*,
    f.filename,
    f.file_size,
    f.analysis
  INTO v_estimate
  FROM estimates e
  LEFT JOIN files f ON e.file_id = f.id
  WHERE e.id = p_estimate_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION SQLSTATE 'P0001' USING MESSAGE = 'Estimate not found';
  END IF;
  
  -- Check if user owns this estimate
  IF v_estimate.user_id != p_user_id THEN
    RAISE EXCEPTION SQLSTATE 'P0002' USING MESSAGE = 'Access denied';
  END IF;
  
  -- Get user data
  SELECT 
    full_name,
    email,
    company,
    phone
  INTO v_user_data
  FROM profiles
  WHERE id = p_user_id;
  
  -- Build comprehensive result
  v_result := json_build_object(
    'id', v_estimate.id,
    'file_name', v_estimate.filename,
    'settings', v_estimate.settings,
    'cost_breakdown', v_estimate.cost_breakdown,
    'print_time', v_estimate.print_time,
    'estimated_time', v_estimate.estimated_time,
    'quantity', v_estimate.quantity,
    'currency', COALESCE(v_estimate.currency, 'USD'),
    'unit_cost', v_estimate.unit_cost,
    'total_cost', v_estimate.total_cost,
    'files', json_build_object(
      'filename', v_estimate.filename,
      'file_size', v_estimate.file_size,
      'analysis', v_estimate.analysis
    ),
    'user', json_build_object(
      'full_name', v_user_data.full_name,
      'email', v_user_data.email,
      'company', v_user_data.company,
      'phone', v_user_data.phone
    )
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic quote save function
CREATE OR REPLACE FUNCTION save_quote_atomic(
  p_quote_data JSONB,
  p_audit_context JSONB,
  p_request_id TEXT
) RETURNS JSONB AS $$
DECLARE
  v_quote_id UUID;
  v_result JSONB;
BEGIN
  -- Start serializable transaction
  SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
  
  -- Insert quote record
  INSERT INTO quotes (
    quote_number,
    user_id,
    estimate_id,
    amount,
    currency,
    valid_until,
    terms,
    notes,
    status,
    pdf_generated_at,
    pdf_size,
    created_at,
    updated_at
  ) VALUES (
    p_quote_data->>'quote_number',
    (p_quote_data->>'user_id')::UUID,
    (p_quote_data->>'estimate_id')::UUID,
    (p_quote_data->>'amount')::DECIMAL,
    p_quote_data->>'currency',
    (p_quote_data->>'valid_until')::TIMESTAMP,
    p_quote_data->>'terms',
    p_quote_data->>'notes',
    p_quote_data->>'status',
    NOW(),
    (p_quote_data->>'pdf_size')::INTEGER,
    NOW(),
    NOW()
  ) RETURNING id INTO v_quote_id;
  
  -- Update estimate status
  UPDATE estimates 
  SET 
    quote_generated = TRUE,
    quote_generated_at = NOW(),
    updated_at = NOW()
  WHERE id = (p_quote_data->>'estimate_id')::UUID;
  
  -- Log activity
  INSERT INTO activity_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    metadata,
    created_at
  ) VALUES (
    (p_quote_data->>'user_id')::UUID,
    'quote_generated',
    'quote',
    v_quote_id,
    jsonb_build_object(
      'quote_number', p_quote_data->>'quote_number',
      'amount', p_quote_data->>'amount',
      'estimate_id', p_quote_data->>'estimate_id',
      'request_id', p_request_id,
      'pdf_size', p_quote_data->>'pdf_size'
    ),
    NOW()
  );
  
  -- Return result
  v_result := jsonb_build_object(
    'quote_id', v_quote_id,
    'quote_number', p_quote_data->>'quote_number',
    'status', 'success'
  );
  
  RETURN v_result;
  
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
      jsonb_build_object(
        'function', 'save_quote_atomic',
        'quote_data', p_quote_data,
        'request_id', p_request_id
      ),
      (p_quote_data->>'user_id')::UUID,
      NOW()
    );
    
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
