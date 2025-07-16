# 🚀 REYAL 3D Printing Platform - Complete Setup Guide

This is the **official and complete setup guide** for the REYAL 3D Printing Platform. This single document contains all necessary instructions for setting up the project from development to production deployment.

## 📋 Table of Contents

1. [Project Overview](#1-project-overview)
2. [Prerequisites](#2-prerequisites)
3. [Local Development Setup](#3-local-development-setup)
4. [Database Setup (Supabase)](#4-database-setup-supabase)
5. [Environment Configuration](#5-environment-configuration)
6. [Service Integrations](#6-service-integrations)
7. [Production Deployment](#7-production-deployment)
8. [Testing](#8-testing)
9. [Monitoring & Maintenance](#9-monitoring--maintenance)
10. [Troubleshooting](#10-troubleshooting)

## 1. Project Overview

REYAL is a comprehensive 3D printing service platform built with:
- **Frontend**: Next.js 15 with App Router, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes with TypeScript
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Authentication**: Supabase Auth with email/OAuth
- **Storage**: Supabase Storage for 3D models and images
- **Deployment**: Vercel with custom domain support
- **Testing**: Jest (unit), Playwright (E2E), comprehensive API testing

### Key Features
- 🔐 Secure user authentication and profiles
- 📁 3D model file upload and analysis (STL, OBJ, 3MF)
- 💰 Automated cost calculation and quote generation
- 🛒 Shopping cart and order management
- 🏪 Marketplace for 3D models with search and filtering
- 👤 User dashboard with order tracking
- 📊 Admin panel for order and user management
- 🎨 Unified dark theme design system
- 📱 Fully responsive mobile design

## 2. Prerequisites

### Required Accounts & Services
- [ ] **GitHub Account** (for code repository)
- [ ] **Vercel Account** (for hosting - free tier sufficient)
- [ ] **Supabase Account** (database & auth - free tier sufficient)
- [ ] **Custom Domain** (optional for production)
- [ ] **Email Service**: Gmail/Google Workspace or SendGrid
- [ ] **Payment Provider** (optional): Stripe or Razorpay

### Development Environment
- **Node.js** 18+ 
- **npm** or **pnpm** (recommended)
- **Git**
- **VS Code** (recommended) with TypeScript extension

### System Requirements
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 2GB free space minimum
- **Network**: Stable internet connection for API calls

## 3. Local Development Setup

### Step 1: Clone Repository
```bash
git clone https://github.com/r3tr056/reyal-web.git
cd reyal-web
```

### Step 2: Install Dependencies
```bash
# Using npm
npm install

# Or using pnpm (faster)
pnpm install
```

### Step 3: Environment Variables
```bash
# Copy environment template
cp .env.example .env.local

# Edit the file with your actual values
nano .env.local
```

### Step 4: Start Development Server
```bash
npm run dev
# or
pnpm dev
```

The application will be available at `http://localhost:3000`

## 4. Database Setup (Supabase)

### Step 1: Create Supabase Project
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click **"New Project"**
3. Choose your organization
4. Set project details:
   - **Name**: `reyal-3d-printing`
   - **Database Password**: Generate strong password (save this!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Start with Free tier

### Step 2: Database Schema Setup
Navigate to **SQL Editor** in Supabase dashboard and run this single comprehensive script:

```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  address JSONB,
  is_admin BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  credits DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Files table for uploaded 3D models
CREATE TABLE IF NOT EXISTS public.files (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  original_filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  upload_status TEXT DEFAULT 'pending' CHECK (upload_status IN ('pending', 'processing', 'completed', 'failed')),
  analysis_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Print jobs table
CREATE TABLE IF NOT EXISTS public.print_jobs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  file_id UUID REFERENCES public.files ON DELETE CASCADE NOT NULL,
  settings JSONB NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'quoted', 'confirmed', 'printing', 'completed', 'shipped', 'delivered', 'cancelled')),
  cost_breakdown JSONB,
  total_cost DECIMAL(10,2),
  estimated_delivery DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  order_number TEXT UNIQUE NOT NULL,
  items JSONB NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  taxes DECIMAL(10,2) NOT NULL,
  shipping DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
  shipping_address JSONB NOT NULL,
  billing_address JSONB NOT NULL,
  payment_intent_id TEXT,
  tracking_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Marketplace products table
CREATE TABLE IF NOT EXISTS public.marketplace_products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  designer_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  short_description TEXT,
  price NUMERIC(10,2) NOT NULL,
  original_price NUMERIC(10,2),
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  material TEXT NOT NULL,
  print_time TEXT,
  complexity INTEGER CHECK (complexity BETWEEN 1 AND 5),
  file_path TEXT NOT NULL,
  preview_images TEXT[] DEFAULT '{}',
  download_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  rating_average NUMERIC(2,1) DEFAULT 0.0,
  rating_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  is_approved BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product categories table
CREATE TABLE IF NOT EXISTS public.product_categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  icon TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product reviews table
CREATE TABLE IF NOT EXISTS public.product_reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.marketplace_products ON DELETE CASCADE NOT NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5) NOT NULL,
  comment TEXT,
  images TEXT[] DEFAULT '{}',
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- User wishlists table
CREATE TABLE IF NOT EXISTS public.user_wishlists (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.marketplace_products ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_files_user_id ON public.files(user_id);
CREATE INDEX IF NOT EXISTS idx_print_jobs_user_id ON public.print_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_print_jobs_status ON public.print_jobs(status);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_products_category ON public.marketplace_products(category);
CREATE INDEX IF NOT EXISTS idx_marketplace_products_featured ON public.marketplace_products(is_featured);
CREATE INDEX IF NOT EXISTS idx_marketplace_products_active ON public.marketplace_products(is_active, is_approved);
CREATE INDEX IF NOT EXISTS idx_marketplace_products_tags ON public.marketplace_products USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON public.product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = id);

-- Files policies
CREATE POLICY "Users can view own files" ON public.files
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own files" ON public.files
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own files" ON public.files
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own files" ON public.files
FOR DELETE USING (auth.uid() = user_id);

-- Print jobs policies
CREATE POLICY "Users can view own print jobs" ON public.print_jobs
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own print jobs" ON public.print_jobs
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own print jobs" ON public.print_jobs
FOR UPDATE USING (auth.uid() = user_id);

-- Orders policies
CREATE POLICY "Users can view own orders" ON public.orders
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own orders" ON public.orders
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Marketplace products policies
CREATE POLICY "Anyone can view active products" ON public.marketplace_products
FOR SELECT USING (is_active = true AND is_approved = true);

CREATE POLICY "Designers can manage own products" ON public.marketplace_products
FOR ALL USING (auth.uid() = designer_id);

-- Product categories policies
CREATE POLICY "Anyone can view active categories" ON public.product_categories
FOR SELECT USING (is_active = true);

-- Product reviews policies
CREATE POLICY "Anyone can view reviews" ON public.product_reviews
FOR SELECT USING (true);

CREATE POLICY "Users can insert own reviews" ON public.product_reviews
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews" ON public.product_reviews
FOR UPDATE USING (auth.uid() = user_id);

-- User wishlists policies
CREATE POLICY "Users can view own wishlist" ON public.user_wishlists
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own wishlist" ON public.user_wishlists
FOR ALL USING (auth.uid() = user_id);

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON public.notifications
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
FOR UPDATE USING (auth.uid() = user_id);

-- Create functions and triggers
-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to relevant tables
DROP TRIGGER IF EXISTS handle_profiles_updated_at ON public.profiles;
CREATE TRIGGER handle_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_files_updated_at ON public.files;
CREATE TRIGGER handle_files_updated_at
  BEFORE UPDATE ON public.files
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_print_jobs_updated_at ON public.print_jobs;
CREATE TRIGGER handle_print_jobs_updated_at
  BEFORE UPDATE ON public.print_jobs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_orders_updated_at ON public.orders;
CREATE TRIGGER handle_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_marketplace_products_updated_at ON public.marketplace_products;
CREATE TRIGGER handle_marketplace_products_updated_at
  BEFORE UPDATE ON public.marketplace_products
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function to generate order numbers
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number = 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('order_sequence')::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for order numbers
CREATE SEQUENCE IF NOT EXISTS order_sequence START 1;

-- Trigger for order number generation
DROP TRIGGER IF EXISTS generate_order_number_trigger ON public.orders;
CREATE TRIGGER generate_order_number_trigger
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.generate_order_number();

-- Advanced marketplace functions
CREATE OR REPLACE FUNCTION search_marketplace_products(
  search_query TEXT DEFAULT '',
  category_filter TEXT DEFAULT '',
  min_price NUMERIC DEFAULT 0,
  max_price NUMERIC DEFAULT 999999,
  tag_filters TEXT[] DEFAULT '{}',
  sort_by TEXT DEFAULT 'popularity',
  limit_count INTEGER DEFAULT 20,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  short_description TEXT,
  price NUMERIC,
  original_price NUMERIC,
  category TEXT,
  tags TEXT[],
  material TEXT,
  print_time TEXT,
  complexity INTEGER,
  preview_images TEXT[],
  download_count INTEGER,
  view_count INTEGER,
  rating_average NUMERIC,
  rating_count INTEGER,
  is_featured BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mp.id,
    mp.title,
    mp.short_description,
    mp.price,
    mp.original_price,
    mp.category,
    mp.tags,
    mp.material,
    mp.print_time,
    mp.complexity,
    mp.preview_images,
    mp.download_count,
    mp.view_count,
    mp.rating_average,
    mp.rating_count,
    mp.is_featured,
    mp.created_at
  FROM marketplace_products mp
  WHERE 
    mp.is_active = true 
    AND mp.is_approved = true
    AND (search_query = '' OR mp.title ILIKE '%' || search_query || '%' OR mp.description ILIKE '%' || search_query || '%')
    AND (category_filter = '' OR mp.category = category_filter)
    AND mp.price >= min_price
    AND mp.price <= max_price
    AND (array_length(tag_filters, 1) IS NULL OR mp.tags && tag_filters)
  ORDER BY 
    CASE 
      WHEN sort_by = 'price_low' THEN mp.price 
      ELSE NULL 
    END ASC,
    CASE 
      WHEN sort_by = 'price_high' THEN mp.price 
      ELSE NULL 
    END DESC,
    CASE 
      WHEN sort_by = 'rating' THEN mp.rating_average 
      ELSE NULL 
    END DESC,
    CASE 
      WHEN sort_by = 'newest' THEN mp.created_at 
      ELSE NULL 
    END DESC,
    CASE 
      WHEN sort_by = 'popularity' THEN (mp.download_count * 0.6 + mp.view_count * 0.4)
      ELSE NULL 
    END DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Insert seed data for categories
INSERT INTO public.product_categories (name, slug, description, icon, sort_order) VALUES
('Accessories', 'accessories', 'Phone stands, keychains, and daily-use items', 'Smartphone', 1),
('Office & Workspace', 'office-workspace', 'Desk organizers, pen holders, office tools', 'Briefcase', 2),
('Home & Living', 'home-living', 'Planters, decorative items, household tools', 'Home', 3),
('Gaming & Entertainment', 'gaming-entertainment', 'Gaming accessories, entertainment items', 'Gamepad2', 4),
('Art & Sculpture', 'art-sculpture', 'Artistic pieces and decorative sculptures', 'Palette', 5),
('Tools & Hardware', 'tools-hardware', 'Workshop tools, organizers, hardware', 'Wrench', 6),
('Figurines & Models', 'figurines-models', 'Character figurines and model collectibles', 'Users', 7),
('Automotive', 'automotive', 'Car accessories and automotive tools', 'Car', 8),
('Educational', 'educational', 'Learning aids and educational models', 'GraduationCap', 9),
('Prototyping', 'prototyping', 'Rapid prototyping and design validation', 'Zap', 10)
ON CONFLICT (slug) DO NOTHING;
```

### Step 3: Storage Buckets Setup
Create these storage buckets in Supabase Storage:

1. **3d-models** (Private)
   - For user uploaded STL/OBJ files
   - Max size: 100MB
   - Allowed file types: `.stl`, `.obj`, `.3mf`, `.ply`

2. **product-images** (Public)
   - For marketplace product images
   - Max size: 10MB
   - Allowed file types: `.jpg`, `.jpeg`, `.png`, `.webp`

3. **user-avatars** (Public)
   - For user profile pictures
   - Max size: 5MB
   - Allowed file types: `.jpg`, `.jpeg`, `.png`, `.webp`

### Step 4: Authentication Configuration
1. Go to **Authentication > Settings**
2. Set Site URL: `http://localhost:3000` (development) or `https://your-domain.com` (production)
3. Add Redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `https://your-domain.com/auth/callback`
4. Enable email confirmations
5. Customize email templates if needed

## 5. Environment Configuration

### Required Environment Variables

Create `.env.local` file with these variables:

```env
# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=REYAL 3D Printing
NODE_ENV=development

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-key

# Database
DATABASE_URL=postgresql://postgres:password@db.project.supabase.co:5432/postgres

# File Upload Configuration
NEXT_PUBLIC_MAX_FILE_SIZE=104857600  # 100MB
NEXT_PUBLIC_ALLOWED_FILE_TYPES=.stl,.obj,.3mf,.ply

# Email Configuration (Choose one)
# Option 1: Gmail/Google Workspace
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Option 2: SendGrid (Recommended for production)
# SMTP_HOST=smtp.sendgrid.net
# SMTP_PORT=587
# SMTP_USER=apikey
# SMTP_PASS=your-sendgrid-api-key

FROM_EMAIL=REYAL 3D Printing <noreply@your-domain.com>

# Payment Configuration (Optional)
# Stripe (International)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Razorpay (India)
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=your-razorpay-secret

# Security
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000

# Monitoring (Optional)
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
SENTRY_DSN=https://your-sentry-dsn
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn
```

### Production Environment Variables
For production deployment, use these values:

```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXTAUTH_URL=https://your-domain.com

# Use production keys for all services
# Update Supabase URLs to production
# Use live payment keys (pk_live_, sk_live_)
```

## 6. Service Integrations

### Email Service Setup

#### Option A: Gmail/Google Workspace
1. Enable 2-factor authentication
2. Generate App Password in Google Account settings
3. Use app password in `SMTP_PASS` environment variable

#### Option B: SendGrid (Recommended for production)
1. Create SendGrid account
2. Verify sender identity
3. Generate API key
4. Use API key as `SMTP_PASS`

### Payment Integration (Optional)

#### Stripe Setup
1. Create Stripe account
2. Get API keys from dashboard
3. Set up webhook endpoint: `https://your-domain.com/api/webhooks/stripe`
4. Configure webhook events: `payment_intent.succeeded`, `payment_intent.payment_failed`

#### Razorpay Setup (India)
1. Create Razorpay account
2. Complete KYC verification
3. Get API keys from dashboard
4. Configure webhook endpoint: `https://your-domain.com/api/webhooks/razorpay`

## 7. Production Deployment

### Step 1: Vercel Setup
1. Connect GitHub repository to Vercel
2. Configure build settings:
   - Framework: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

### Step 2: Environment Variables
Add all production environment variables in Vercel dashboard

### Step 3: Domain Configuration (Optional)
1. Purchase domain from registrar
2. Add domain to Vercel project
3. Configure DNS records
4. Wait for SSL certificate provisioning

### Step 4: Database Migration
1. Create production Supabase project
2. Run the database setup script
3. Update environment variables
4. Test database connectivity

### Step 5: Deploy
```bash
# Using Vercel CLI
vercel --prod

# Or through Vercel dashboard
# Push to main branch triggers automatic deployment
```

## 8. Testing

### Run Test Suite
```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# All tests with coverage
npm run test:all
```

### Manual Testing Checklist
- [ ] User registration and login
- [ ] File upload (STL, OBJ files)
- [ ] 3D model analysis
- [ ] Cost calculation
- [ ] Quote generation
- [ ] Marketplace browsing
- [ ] Shopping cart functionality
- [ ] Order placement
- [ ] Email notifications
- [ ] Admin dashboard access

## 9. Monitoring & Maintenance

### Health Checks
- Monitor database performance in Supabase dashboard
- Check API response times
- Monitor error rates in Vercel dashboard
- Review email delivery reports

### Regular Maintenance
- Update dependencies monthly
- Review security policies quarterly
- Monitor storage usage
- Backup important data
- Update documentation as needed

## 10. Troubleshooting

### Common Issues

#### Database Connection Issues
- Check DATABASE_URL format
- Verify Supabase project is running
- Confirm RLS policies are correct

#### File Upload Problems
- Check SUPABASE_SERVICE_ROLE_KEY
- Verify storage bucket permissions
- Confirm file size limits

#### Email Not Sending
- Test SMTP credentials
- Check email service rate limits
- Verify sender domain authentication

#### Payment Integration Issues
- Confirm webhook endpoints are accessible
- Check webhook secret keys
- Verify payment provider account status

### Debug Commands
```bash
# Check environment variables
npm run env:check

# Test database connection
npm run test:db

# Verify API endpoints
npm run test:api

# Check build process
npm run build
```

### Getting Help
1. Check application logs in Vercel dashboard
2. Review database logs in Supabase dashboard
3. Check browser console for client-side errors
4. Review API response headers for detailed error messages

---

## 🎉 Setup Complete!

Your REYAL 3D Printing Platform is now ready for use. The application should be fully functional with:

- ✅ Database configured with all tables and relationships
- ✅ Authentication working with email signup/login
- ✅ File upload and 3D model processing
- ✅ Marketplace with search and filtering
- ✅ Order management and user dashboard
- ✅ Admin panel for managing orders and users
- ✅ Email notifications for order updates
- ✅ Unified dark theme design

### Next Steps
1. Customize branding and content
2. Add your own 3D printing materials and pricing
3. Populate marketplace with initial products
4. Set up monitoring and analytics
5. Launch to users!

**Support**: If you encounter any issues, refer to the troubleshooting section or check the project documentation.