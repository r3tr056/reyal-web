-- Complete Marketplace Setup Script for REYAL 3D Printing Platform
-- This script sets up the database schema and populates it with seed data

-- First, run the main schema if not already done
-- This assumes the base schema from schema.sql is already applied

-- Enable RLS on auth.users if not already done
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Ensure we have the marketplace-specific tables and functions

-- Function to increment product view count
CREATE OR REPLACE FUNCTION increment_product_view_count(product_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE marketplace_products 
  SET view_count = view_count + 1
  WHERE id = product_uuid AND is_active = true AND is_approved = true;
END;
$$ LANGUAGE plpgsql;

-- Function to get featured products
CREATE OR REPLACE FUNCTION get_featured_products(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  id UUID,
  title TEXT,
  price NUMERIC,
  preview_images TEXT[],
  rating_average NUMERIC,
  rating_count INTEGER,
  category TEXT,
  download_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mp.id,
    mp.title,
    mp.price,
    mp.preview_images,
    mp.rating_average,
    mp.rating_count,
    mp.category,
    mp.download_count
  FROM marketplace_products mp
  WHERE mp.is_featured = true 
    AND mp.is_active = true 
    AND mp.is_approved = true
  ORDER BY mp.rating_average DESC, mp.download_count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get trending products (high views/downloads in last 30 days)
CREATE OR REPLACE FUNCTION get_trending_products(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  id UUID,
  title TEXT,
  price NUMERIC,
  preview_images TEXT[],
  rating_average NUMERIC,
  rating_count INTEGER,
  category TEXT,
  download_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mp.id,
    mp.title,
    mp.price,
    mp.preview_images,
    mp.rating_average,
    mp.rating_count,
    mp.category,
    mp.download_count
  FROM marketplace_products mp
  WHERE mp.is_active = true 
    AND mp.is_approved = true
    AND mp.created_at > NOW() - INTERVAL '30 days'
  ORDER BY 
    (mp.view_count + mp.download_count * 5) DESC,
    mp.rating_average DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to search products with ranking
CREATE OR REPLACE FUNCTION search_marketplace_products(
  search_query TEXT,
  category_filter TEXT DEFAULT NULL,
  min_price NUMERIC DEFAULT NULL,
  max_price NUMERIC DEFAULT NULL,
  tag_filters TEXT[] DEFAULT NULL,
  sort_by TEXT DEFAULT 'relevance',
  offset_count INTEGER DEFAULT 0,
  limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  short_description TEXT,
  price NUMERIC,
  original_price NUMERIC,
  preview_images TEXT[],
  rating_average NUMERIC,
  rating_count INTEGER,
  category TEXT,
  tags TEXT[],
  download_count INTEGER,
  material_codes TEXT[],
  print_time_hours NUMERIC,
  complexity INTEGER,
  is_featured BOOLEAN,
  created_at TIMESTAMPTZ,
  relevance_score REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mp.id,
    mp.title,
    mp.description,
    mp.short_description,
    mp.price,
    mp.original_price,
    mp.preview_images,
    mp.rating_average,
    mp.rating_count,
    mp.category,
    mp.tags,
    mp.download_count,
    mp.material_codes,
    mp.print_time_hours,
    mp.complexity,
    mp.is_featured,
    mp.created_at,
    CASE 
      WHEN search_query IS NULL OR search_query = '' THEN 1.0
      ELSE ts_rank(
        to_tsvector('english', mp.title || ' ' || COALESCE(mp.description, '') || ' ' || COALESCE(mp.short_description, '')),
        plainto_tsquery('english', search_query)
      )
    END as relevance_score
  FROM marketplace_products mp
  WHERE mp.is_active = true 
    AND mp.is_approved = true
    AND (search_query IS NULL OR search_query = '' OR (
      to_tsvector('english', mp.title || ' ' || COALESCE(mp.description, '') || ' ' || COALESCE(mp.short_description, ''))
      @@ plainto_tsquery('english', search_query)
    ))
    AND (category_filter IS NULL OR mp.category = category_filter)
    AND (min_price IS NULL OR mp.price >= min_price)
    AND (max_price IS NULL OR mp.price <= max_price)
    AND (tag_filters IS NULL OR mp.tags && tag_filters)
  ORDER BY 
    CASE sort_by
      WHEN 'relevance' THEN relevance_score
      WHEN 'price_low' THEN -mp.price
      WHEN 'price_high' THEN mp.price
      WHEN 'rating' THEN -mp.rating_average
      WHEN 'newest' THEN EXTRACT(EPOCH FROM mp.created_at)
      WHEN 'popular' THEN -mp.download_count
      ELSE relevance_score
    END DESC,
    mp.rating_average DESC,
    mp.created_at DESC
  OFFSET offset_count
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Insert sample users for the marketplace (these would normally be created through auth)
-- Note: In production, these should be real auth.users entries
DO $$
BEGIN
  -- Only insert if the users don't already exist
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = '11111111-1111-1111-1111-111111111111') THEN
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token) VALUES 
    ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'designer1@example.com', crypt('password123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Tech Designs Studio"}', NOW(), NOW(), '', '', '', '');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = '22222222-2222-2222-2222-222222222222') THEN
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token) VALUES 
    ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'workspace@example.com', crypt('password123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"WorkSpace Innovations"}', NOW(), NOW(), '', '', '', '');
  END IF;
  
  -- Add more sample users...
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = '33333333-3333-3333-3333-333333333333') THEN
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token) VALUES 
    ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'fantasy@example.com', crypt('password123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Fantasy Maker Arts"}', NOW(), NOW(), '', '', '', '');
  END IF;
END $$;

-- Insert corresponding profiles
INSERT INTO profiles (id, email, full_name, is_admin) VALUES 
('11111111-1111-1111-1111-111111111111', 'designer1@example.com', 'Tech Designs Studio', false),
('22222222-2222-2222-2222-222222222222', 'workspace@example.com', 'WorkSpace Innovations', false),
('33333333-3333-3333-3333-333333333333', 'fantasy@example.com', 'Fantasy Maker Arts', false),
('44444444-4444-4444-4444-444444444444', 'personal@example.com', 'Personal Touch Design', false),
('55555555-5555-5555-5555-555555555555', 'geometry@example.com', 'Geometry Lab', false),
('66666666-6666-6666-6666-666666666666', 'green@example.com', 'Green Space Designs', false),
('77777777-7777-7777-7777-777777777777', 'game@example.com', 'Game Gear Studios', false),
('88888888-8888-8888-8888-888888888888', 'luxury@example.com', 'Luxury Craft Co', false),
('99999999-9999-9999-9999-999999999999', 'innovative@example.com', 'Innovative Prints', false),
('10101010-1010-1010-1010-101010101010', 'creative@example.com', 'Creative Minds', false),
('20202020-2020-2020-2020-202020202020', 'custom@example.com', 'Custom Design Pro', false),
('30303030-3030-3030-3030-303030303030', 'spiral@example.com', 'Spiral Arts', false),
('40404040-4040-4040-4040-404040404040', 'precision@example.com', 'Precision Tools', false),
('50505050-5050-5050-5050-505050505050', 'abstract@example.com', 'Abstract Studios', false),
('60606060-6060-6060-6060-606060606060', 'universal@example.com', 'Universal Designs', false),
('70707070-7070-7070-7070-707070707070', 'kitchen@example.com', 'Kitchen Pro', false)
ON CONFLICT (id) DO NOTHING;

-- Create indexes for full-text search
CREATE INDEX IF NOT EXISTS idx_marketplace_products_search ON marketplace_products USING GIN (to_tsvector('english', title || ' ' || COALESCE(description, '') || ' ' || COALESCE(short_description, '')));

-- Create additional performance indexes
CREATE INDEX IF NOT EXISTS idx_marketplace_products_category_active ON marketplace_products(category, is_active, is_approved);
CREATE INDEX IF NOT EXISTS idx_marketplace_products_price_range ON marketplace_products(price, is_active, is_approved);
CREATE INDEX IF NOT EXISTS idx_marketplace_products_tags_gin ON marketplace_products USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_marketplace_products_featured_rating ON marketplace_products(is_featured, rating_average DESC) WHERE is_active = true AND is_approved = true;
CREATE INDEX IF NOT EXISTS idx_marketplace_products_trending ON marketplace_products(created_at DESC, view_count DESC, download_count DESC) WHERE is_active = true AND is_approved = true;

-- Update search configuration for better full-text search
ALTER TEXT SEARCH CONFIGURATION english ADD MAPPING FOR asciiword, asciihword, hword_asciipart WITH simple;