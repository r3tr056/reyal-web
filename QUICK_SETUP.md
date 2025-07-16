# 🔗 Quick Service Connection Guide

This guide provides the essential steps to connect all services for the REYAL 3D Printing platform.

## 🚀 Quick Setup (30 minutes)

### 1. Supabase Setup (10 minutes)
```bash
# 1. Create Supabase project at https://app.supabase.com
# 2. Copy these values:
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# 3. Run database setup (copy SQL from SUPABASE_SETUP.md)
# 4. Configure storage buckets: 3d-models, product-images, user-avatars
# 5. Enable RLS on all tables
```

### 2. Vercel Deployment (10 minutes)
```bash
# 1. Connect GitHub repo to Vercel
# 2. Add environment variables (see PRODUCTION_DEPLOYMENT.md)
# 3. Deploy with custom domain
# 4. Configure security headers in vercel.json
```

### 3. Email Service (5 minutes)
```bash
# Option A: Gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Option B: SendGrid (Recommended)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

### 4. Payment Setup (5 minutes)
```bash
# For International: Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...

# For India: Razorpay
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=your-secret
```

## 🛠️ Essential Environment Variables

Create `.env.local` for development and add these to Vercel for production:

```env
# Core Configuration
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJ...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJ...

# Database
DATABASE_URL=postgresql://postgres:password@db.project.supabase.co:5432/postgres

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@your-domain.com
SMTP_PASS=your-app-password
FROM_EMAIL=REYAL 3D Printing <noreply@your-domain.com>

# Payments
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# File Upload
NEXT_PUBLIC_MAX_FILE_SIZE=104857600
NEXT_PUBLIC_ALLOWED_FILE_TYPES=.stl,.obj,.3mf,.ply

# Security
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=https://your-domain.com
```

## 🗄️ Database Setup (Essential Tables)

Run this SQL in Supabase SQL Editor:

```sql
-- 1. Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create core tables
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.files (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  original_filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  order_number TEXT UNIQUE NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 4. Create policies
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can view own files" ON public.files
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own orders" ON public.orders
FOR SELECT USING (auth.uid() = user_id);
```

## 📁 Storage Buckets Setup

Create these buckets in Supabase Storage:

1. **3d-models** (Private)
   - For user uploaded STL/OBJ files
   - Max size: 100MB

2. **product-images** (Public)
   - For marketplace product images
   - Max size: 10MB

3. **user-avatars** (Public)
   - For user profile pictures
   - Max size: 5MB

## 🔐 Authentication Setup

1. Go to Supabase Authentication > Settings
2. Set Site URL: `https://your-domain.com`
3. Add Redirect URLs:
   - `https://your-domain.com/auth/callback`
   - `http://localhost:3000/auth/callback`

## 📧 Email Configuration

### Gmail Setup:
1. Enable 2-factor authentication
2. Generate App Password
3. Use app password in SMTP_PASS

### SendGrid Setup:
1. Create SendGrid account
2. Verify sender identity
3. Generate API key

## 💳 Payment Configuration

### Stripe:
1. Create Stripe account
2. Get API keys from dashboard
3. Set up webhooks: `https://your-domain.com/api/webhooks/stripe`

### Razorpay (India):
1. Create Razorpay account
2. Complete KYC verification
3. Get API keys from dashboard

## 🚀 Deployment Commands

```bash
# Local development
npm run dev

# Build for production
npm run build

# Deploy to Vercel
vercel --prod

# Check deployment
curl https://your-domain.com/api/health
```

## ✅ Testing Checklist

After setup, test these features:

- [ ] User registration/login
- [ ] File upload
- [ ] Database operations
- [ ] Email sending
- [ ] Payment processing
- [ ] API endpoints

## 📞 Quick Support

**Common Issues:**
- **Database connection**: Check DATABASE_URL format
- **File upload**: Verify SUPABASE_SERVICE_ROLE_KEY
- **Email**: Test SMTP credentials
- **Payment**: Verify webhook endpoints

**Documentation:**
- Complete setup: `SUPABASE_SETUP.md`
- Full deployment: `PRODUCTION_DEPLOYMENT.md`
- Testing guide: `TESTING.md`

## 🎯 Go Live

Once everything is working:
1. Point your domain to Vercel
2. Update environment variables to production values
3. Test all critical flows
4. Monitor for issues
5. 🎉 You're live!

---

**Need help?** Check the detailed guides in this repository or create an issue on GitHub.