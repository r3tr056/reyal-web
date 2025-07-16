# 🚀 Supabase Setup Guide for REYAL 3D Printing Platform

This comprehensive guide will walk you through setting up all Supabase services required for the REYAL 3D printing platform.

## 📋 Table of Contents

1. [Project Creation](#1-project-creation)
2. [Database Setup](#2-database-setup)
3. [Authentication Configuration](#3-authentication-configuration)
4. [Storage Configuration](#4-storage-configuration)
5. [Email Configuration](#5-email-configuration)
6. [Edge Functions](#6-edge-functions)
7. [Environment Variables](#7-environment-variables)
8. [Security Rules (RLS)](#8-security-rules-rls)
9. [API Keys & Configuration](#9-api-keys--configuration)

## 1. Project Creation

### Step 1: Create New Project
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click "New Project"
3. Choose your organization
4. Set project details:
   - **Name**: `reyal-3d-printing`
   - **Database Password**: Generate strong password (save this!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Start with Free tier

### Step 2: Wait for Project Setup
- Wait 2-5 minutes for project initialization
- Note down your project URL and anon key

## 2. Database Setup

### Step 1: Create Tables
Navigate to **SQL Editor** in Supabase dashboard and run these SQL commands:

```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users profile table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  address JSONB,
  is_admin BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  credits DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Files table for uploaded 3D models
CREATE TABLE public.files (
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
CREATE TABLE public.print_jobs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  file_id UUID REFERENCES public.files ON DELETE CASCADE NOT NULL,
  settings JSONB NOT NULL, -- material, quality, infill, etc.
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'quoted', 'confirmed', 'printing', 'completed', 'shipped', 'delivered', 'cancelled')),
  cost_breakdown JSONB,
  total_cost DECIMAL(10,2),
  estimated_delivery DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quotes table
CREATE TABLE public.quotes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  file_id UUID REFERENCES public.files ON DELETE CASCADE NOT NULL,
  print_job_id UUID REFERENCES public.print_jobs ON DELETE CASCADE,
  settings JSONB NOT NULL,
  cost_breakdown JSONB NOT NULL,
  total_cost DECIMAL(10,2) NOT NULL,
  estimated_days INTEGER NOT NULL,
  valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'accepted', 'expired', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders table
CREATE TABLE public.orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  order_number TEXT UNIQUE NOT NULL,
  items JSONB NOT NULL, -- Array of print jobs
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
CREATE TABLE public.marketplace_products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  designer_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2),
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  material TEXT NOT NULL,
  print_time TEXT,
  complexity INTEGER CHECK (complexity BETWEEN 1 AND 5),
  file_path TEXT NOT NULL,
  preview_images TEXT[] DEFAULT '{}',
  downloads_count INTEGER DEFAULT 0,
  rating DECIMAL(2,1) DEFAULT 0.0,
  reviews_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reviews table
CREATE TABLE public.reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.marketplace_products ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders ON DELETE CASCADE,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5) NOT NULL,
  comment TEXT,
  images TEXT[] DEFAULT '{}',
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_files_user_id ON public.files(user_id);
CREATE INDEX idx_print_jobs_user_id ON public.print_jobs(user_id);
CREATE INDEX idx_print_jobs_status ON public.print_jobs(status);
CREATE INDEX idx_quotes_user_id ON public.quotes(user_id);
CREATE INDEX idx_quotes_valid_until ON public.quotes(valid_until);
CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_marketplace_products_category ON public.marketplace_products(category);
CREATE INDEX idx_marketplace_products_featured ON public.marketplace_products(is_featured);
CREATE INDEX idx_reviews_product_id ON public.reviews(product_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, is_read);
```

### Step 2: Create Functions and Triggers

```sql
-- Function to handle user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
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
CREATE TRIGGER handle_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_files_updated_at
  BEFORE UPDATE ON public.files
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_print_jobs_updated_at
  BEFORE UPDATE ON public.print_jobs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_orders_updated_at
  BEFORE UPDATE ON public.orders
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
CREATE TRIGGER generate_order_number_trigger
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.generate_order_number();
```

## 3. Authentication Configuration

### Step 1: Configure Auth Settings
1. Go to **Authentication > Settings**
2. Configure the following:

**Site URL**: Add your domain
```
https://your-domain.com
```

**Redirect URLs**: Add all your redirect URLs
```
http://localhost:3000/auth/callback
https://your-domain.com/auth/callback
https://your-vercel-domain.vercel.app/auth/callback
```

### Step 2: Enable Auth Providers

**Email Authentication**:
- ✅ Enable email confirmations
- ✅ Enable email change confirmations
- ✅ Secure password recovery

**Google OAuth** (Optional):
1. Go to **Authentication > Providers**
2. Enable Google provider
3. Add your Google OAuth credentials:
   - Client ID: `your-google-client-id`
   - Client Secret: `your-google-client-secret`

**GitHub OAuth** (Optional):
1. Enable GitHub provider
2. Add GitHub OAuth credentials:
   - Client ID: `your-github-client-id`
   - Client Secret: `your-github-client-secret`

### Step 3: Configure Email Templates
Go to **Authentication > Email Templates** and customize:

**Confirm Signup**:
```html
<h2>Welcome to REYAL 3D Printing!</h2>
<p>Thank you for signing up. Please confirm your email address.</p>
<p><a href="{{ .ConfirmationURL }}">Confirm Email</a></p>
```

**Reset Password**:
```html
<h2>Reset Your Password</h2>
<p>Click the link below to reset your password:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
```

## 4. Storage Configuration

### Step 1: Create Storage Buckets
Go to **Storage** and create these buckets:

1. **3d-models** (Private)
   - For uploaded STL/OBJ files
   - File size limit: 100MB
   - Allowed file types: `.stl`, `.obj`, `.3mf`, `.ply`

2. **product-images** (Public)
   - For marketplace product images
   - File size limit: 10MB
   - Allowed file types: `.jpg`, `.jpeg`, `.png`, `.webp`

3. **user-avatars** (Public)
   - For user profile pictures
   - File size limit: 5MB
   - Allowed file types: `.jpg`, `.jpeg`, `.png`, `.webp`

4. **order-documents** (Private)
   - For order receipts and documents
   - File size limit: 50MB
   - Allowed file types: `.pdf`, `.jpg`, `.png`

### Step 2: Configure Storage Policies
For each bucket, set up the following RLS policies:

**3d-models bucket policies**:
```sql
-- Allow users to upload their own files
CREATE POLICY "Users can upload their own 3D models" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = '3d-models' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to view their own files
CREATE POLICY "Users can view their own 3D models" ON storage.objects
FOR SELECT USING (
  bucket_id = '3d-models' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own files
CREATE POLICY "Users can delete their own 3D models" ON storage.objects
FOR DELETE USING (
  bucket_id = '3d-models' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);
```

**product-images bucket policies**:
```sql
-- Allow anyone to view product images
CREATE POLICY "Anyone can view product images" ON storage.objects
FOR SELECT USING (bucket_id = 'product-images');

-- Allow authenticated users to upload product images
CREATE POLICY "Authenticated users can upload product images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'product-images' AND 
  auth.role() = 'authenticated'
);
```

## 5. Email Configuration

### Step 1: SMTP Setup (Production)
1. Go to **Settings > Auth**
2. Scroll to **SMTP Settings**
3. Configure your email provider:

**For Gmail/Google Workspace**:
```
SMTP Host: smtp.gmail.com
SMTP Port: 587
SMTP User: your-email@gmail.com
SMTP Pass: your-app-password
Sender Name: REYAL 3D Printing
Sender Email: noreply@your-domain.com
```

**For SendGrid**:
```
SMTP Host: smtp.sendgrid.net
SMTP Port: 587
SMTP User: apikey
SMTP Pass: your-sendgrid-api-key
Sender Name: REYAL 3D Printing
Sender Email: noreply@your-domain.com
```

### Step 2: Email Rate Limiting
Configure rate limiting:
- **Max emails per hour**: 100
- **Max emails per user per hour**: 10

## 6. Edge Functions

### Step 1: Install Supabase CLI
```bash
npm install -g supabase
```

### Step 2: Initialize Edge Functions
```bash
supabase functions new email-notifications
supabase functions new file-analysis
supabase functions new payment-webhooks
```

### Step 3: Deploy Edge Functions
```bash
supabase functions deploy --project-ref your-project-ref
```

## 7. Environment Variables

Create these environment variables in your application:

### Required Environment Variables

**Supabase Configuration**:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Database URLs**:
```env
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.your-project-ref.supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres:[YOUR-PASSWORD]@db.your-project-ref.supabase.co:5432/postgres
```

**File Upload**:
```env
NEXT_PUBLIC_MAX_FILE_SIZE=104857600  # 100MB
NEXT_PUBLIC_ALLOWED_FILE_TYPES=.stl,.obj,.3mf,.ply
```

**Email Configuration**:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@your-domain.com
```

**Payment (if using Stripe)**:
```env
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## 8. Security Rules (RLS)

### Step 1: Enable RLS on All Tables
```sql
-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
```

### Step 2: Create RLS Policies

**Profiles table policies**:
```sql
-- Users can view and update their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = id);
```

**Files table policies**:
```sql
-- Users can only access their own files
CREATE POLICY "Users can view own files" ON public.files
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own files" ON public.files
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own files" ON public.files
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own files" ON public.files
FOR DELETE USING (auth.uid() = user_id);
```

**Print jobs table policies**:
```sql
-- Users can only access their own print jobs
CREATE POLICY "Users can view own print jobs" ON public.print_jobs
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own print jobs" ON public.print_jobs
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own print jobs" ON public.print_jobs
FOR UPDATE USING (auth.uid() = user_id);
```

**Orders table policies**:
```sql
-- Users can only access their own orders
CREATE POLICY "Users can view own orders" ON public.orders
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own orders" ON public.orders
FOR INSERT WITH CHECK (auth.uid() = user_id);
```

**Marketplace products policies**:
```sql
-- Anyone can view active marketplace products
CREATE POLICY "Anyone can view active products" ON public.marketplace_products
FOR SELECT USING (is_active = true);

-- Designers can manage their own products
CREATE POLICY "Designers can manage own products" ON public.marketplace_products
FOR ALL USING (auth.uid() = designer_id);
```

## 9. API Keys & Configuration

### Step 1: Get Your API Keys
1. Go to **Settings > API**
2. Copy these keys:
   - **Project URL**: `https://your-project-ref.supabase.co`
   - **Anon Public Key**: `eyJhbGciOiJ...` (for client-side)
   - **Service Role Key**: `eyJhbGciOiJ...` (for server-side, keep secret!)

### Step 2: Database Connection Strings
1. Go to **Settings > Database**
2. Copy connection strings:
   - **Connection string**: For general use
   - **Direct connection**: For migrations and direct access

### Step 3: Configure Connection Pooling
Enable connection pooling for better performance:
1. Go to **Settings > Database**
2. Enable **Connection Pooling**
3. Set pool size: 20 connections
4. Use pooled connection string in production

## 🔐 Security Checklist

- [ ] RLS enabled on all tables
- [ ] Storage policies configured
- [ ] Email confirmations enabled
- [ ] Strong database password set
- [ ] Service role key kept secret
- [ ] CORS configured for your domain
- [ ] Rate limiting enabled
- [ ] File upload limits set
- [ ] Webhook secrets configured

## 🚀 Next Steps

1. Test all authentication flows
2. Upload test files to storage
3. Verify email sending works
4. Test database operations
5. Monitor usage in Supabase dashboard
6. Set up backups and monitoring
7. Configure alerts for errors

## 📞 Support

If you encounter issues:
1. Check [Supabase Documentation](https://supabase.com/docs)
2. Visit [Supabase Discord](https://discord.supabase.com)
3. Review logs in Supabase Dashboard
4. Check network connectivity and CORS settings

## 🔄 Regular Maintenance

- Monitor database performance
- Review and update RLS policies
- Check storage usage
- Update edge functions as needed
- Monitor email delivery rates
- Review security logs regularly

---

✅ **Your Supabase setup is now complete and ready for production!**