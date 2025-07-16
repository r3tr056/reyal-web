# 🚀 Complete Production Deployment Guide

This comprehensive guide covers deploying the REYAL 3D Printing platform to production with all required services and integrations.

## 📋 Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Vercel Deployment Setup](#2-vercel-deployment-setup)
3. [Domain Configuration](#3-domain-configuration)
4. [Environment Variables Setup](#4-environment-variables-setup)
5. [Database Migration](#5-database-migration)
6. [Storage & CDN Configuration](#6-storage--cdn-configuration)
7. [Email Service Integration](#7-email-service-integration)
8. [Payment Integration](#8-payment-integration)
9. [Monitoring & Analytics](#9-monitoring--analytics)
10. [Security Configuration](#10-security-configuration)
11. [Performance Optimization](#11-performance-optimization)
12. [Backup & Recovery](#12-backup--recovery)
13. [Testing & Quality Assurance](#13-testing--quality-assurance)
14. [Deployment Checklist](#14-deployment-checklist)

## 1. Prerequisites

### Required Accounts & Services
- [ ] **GitHub Account** (for code repository)
- [ ] **Vercel Account** (for hosting)
- [ ] **Supabase Account** (database & auth)
- [ ] **Custom Domain** (purchased domain name)
- [ ] **Email Service** (Gmail/SendGrid/AWS SES)
- [ ] **Payment Provider** (Stripe/Razorpay for Indian market)
- [ ] **Monitoring Service** (Sentry/LogRocket - optional)

### Development Environment Setup
```bash
# Clone the repository
git clone https://github.com/your-username/reyal-web.git
cd reyal-web

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Install Vercel CLI
npm install -g vercel

# Install Supabase CLI
npm install -g supabase
```

## 2. Vercel Deployment Setup

### Step 1: Connect GitHub Repository
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"New Project"**
3. Import your GitHub repository
4. Configure build settings:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`

### Step 2: Configure Vercel Project Settings

**vercel.json** configuration:
```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "regions": ["bom1", "sin1"],
  "env": {
    "NODE_ENV": "production"
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "https://your-domain.com"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, POST, PUT, DELETE, OPTIONS"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "Content-Type, Authorization"
        }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=()"
        }
      ]
    }
  ],
  "redirects": [
    {
      "source": "/home",
      "destination": "/",
      "permanent": true
    }
  ],
  "rewrites": [
    {
      "source": "/api/upload",
      "destination": "/api/upload"
    }
  ]
}
```

### Step 3: Deploy to Vercel
```bash
# Login to Vercel
vercel login

# Deploy to production
vercel --prod

# Or use the dashboard deployment
```

## 3. Domain Configuration

### Step 1: Purchase Domain
Recommended domain registrars:
- **Namecheap** (affordable, good support)
- **GoDaddy** (popular, feature-rich)
- **Cloudflare Registrar** (best pricing, integrated with CDN)

### Step 2: Configure DNS
Add these DNS records:

**A Records:**
```
@ -> Vercel IP (76.76.19.61)
www -> Vercel IP (76.76.19.61)
```

**CNAME Records:**
```
api -> your-project.vercel.app
cdn -> your-project.vercel.app
```

**MX Records (for email):**
```
@ -> mx1.your-email-provider.com (Priority: 10)
@ -> mx2.your-email-provider.com (Priority: 20)
```

### Step 3: Add Domain to Vercel
1. Go to **Project Settings > Domains**
2. Add your custom domain: `your-domain.com`
3. Add www subdomain: `www.your-domain.com`
4. Wait for SSL certificate to be issued (automatic)

### Step 4: Verify Domain Setup
```bash
# Check DNS propagation
nslookup your-domain.com

# Test SSL certificate
curl -I https://your-domain.com

# Verify redirects work
curl -I http://www.your-domain.com
```

## 4. Environment Variables Setup

### Step 1: Production Environment Variables
In Vercel Dashboard > Project > Settings > Environment Variables:

**Core Configuration:**
```env
# App Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_APP_NAME=REYAL 3D Printing

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-key
SUPABASE_JWT_SECRET=your-jwt-secret

# Database
DATABASE_URL=postgresql://postgres:password@db.project.supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres:password@db.project.supabase.co:5432/postgres

# File Upload
NEXT_PUBLIC_MAX_FILE_SIZE=104857600
NEXT_PUBLIC_ALLOWED_FILE_TYPES=.stl,.obj,.3mf,.ply
UPLOAD_DIR=/tmp/uploads

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@your-domain.com
SMTP_PASS=your-app-password
FROM_EMAIL=REYAL 3D Printing <noreply@your-domain.com>

# Payment Configuration (Stripe)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Payment Configuration (Razorpay - for India)
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=your-razorpay-secret

# Security
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=https://your-domain.com

# Monitoring & Analytics
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
SENTRY_DSN=https://your-sentry-dsn
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn

# External APIs
OPENAI_API_KEY=sk-...  # For AI features
GOOGLE_MAPS_API_KEY=your-google-maps-key  # For shipping
```

### Step 2: Environment-Specific Variables
Set different values for different environments:

**Development:**
```env
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Staging:**
```env
NODE_ENV=staging
NEXT_PUBLIC_APP_URL=https://staging.your-domain.com
```

**Production:**
```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## 5. Database Migration

### Step 1: Run Database Migrations
```bash
# Using Supabase CLI
supabase db push --project-ref your-project-ref

# Or run SQL directly in Supabase dashboard
# Copy and paste the SQL from SUPABASE_SETUP.md
```

### Step 2: Seed Database with Sample Data
```sql
-- Insert sample marketplace products
INSERT INTO public.marketplace_products (designer_id, name, description, price, category, tags, material, print_time, complexity, file_path, is_featured, is_active) VALUES
(
  (SELECT id FROM auth.users LIMIT 1),
  'Professional Phone Stand',
  'Precision-engineered phone stand for all devices',
  299,
  'Accessories',
  ARRAY['Professional', 'New', 'Featured'],
  'PLA+',
  '3.5h',
  3,
  'marketplace/phone-stand.stl',
  true,
  true
);

-- Insert sample categories and materials
-- (Add more sample data as needed)
```

### Step 3: Test Database Connection
```bash
# Test from your application
npm run test:db

# Or test manually in your API routes
curl https://your-domain.com/api/health
```

## 6. Storage & CDN Configuration

### Step 1: Supabase Storage Setup
Follow the storage setup in `SUPABASE_SETUP.md`:
- Create storage buckets
- Configure policies
- Set up file upload limits

### Step 2: CDN Configuration (Optional)
For better performance, consider using Cloudflare:

1. **Sign up for Cloudflare**
2. **Add your domain**
3. **Configure DNS through Cloudflare**
4. **Enable CDN features:**
   - Auto Minify (CSS, JS, HTML)
   - Brotli compression
   - Image optimization
   - Caching rules

**Cloudflare Page Rules:**
```
your-domain.com/api/* -> Cache Level: Bypass
your-domain.com/_next/static/* -> Cache Level: Standard, Edge TTL: 1 year
your-domain.com/images/* -> Cache Level: Standard, Edge TTL: 1 month
```

## 7. Email Service Integration

### Step 1: Choose Email Provider

**Option A: Gmail/Google Workspace**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password  # Generate in Google Account settings
```

**Option B: SendGrid (Recommended for scale)**
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

**Option C: AWS SES (Cost-effective)**
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-ses-access-key
SMTP_PASS=your-ses-secret-key
```

### Step 2: Configure Email Templates
Create email templates in your application:

**Order Confirmation Template:**
```typescript
// lib/email-templates.ts
export const orderConfirmationTemplate = (order: Order) => ({
  subject: `Order Confirmation - ${order.order_number}`,
  html: `
    <h1>Thank you for your order!</h1>
    <p>Order Number: ${order.order_number}</p>
    <p>Total: ₹${order.total}</p>
    <!-- Add more order details -->
  `
});
```

### Step 3: Set Up Email Automation
```typescript
// lib/email-service.ts
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendOrderConfirmation(order: Order) {
  const template = orderConfirmationTemplate(order);
  
  await transporter.sendMail({
    from: process.env.FROM_EMAIL,
    to: order.user.email,
    subject: template.subject,
    html: template.html,
  });
}
```

## 8. Payment Integration

### Step 1: Stripe Setup (International)

**Install Stripe:**
```bash
npm install stripe @stripe/stripe-js
```

**Configure Stripe:**
```typescript
// lib/stripe.ts
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});
```

**Create Payment Intent API:**
```typescript
// app/api/create-payment-intent/route.ts
import { stripe } from '@/lib/stripe';

export async function POST(request: Request) {
  const { amount, currency = 'usd' } = await request.json();
  
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount * 100, // Convert to cents
    currency,
    metadata: {
      source: 'reyal-3d-printing'
    }
  });
  
  return Response.json({
    clientSecret: paymentIntent.client_secret
  });
}
```

### Step 2: Razorpay Setup (India)

**Install Razorpay:**
```bash
npm install razorpay
```

**Configure Razorpay:**
```typescript
// lib/razorpay.ts
import Razorpay from 'razorpay';

export const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});
```

### Step 3: Webhook Configuration

**Stripe Webhooks:**
```typescript
// app/api/webhooks/stripe/route.ts
import { stripe } from '@/lib/stripe';
import { headers } from 'next/headers';

export async function POST(request: Request) {
  const body = await request.text();
  const signature = headers().get('stripe-signature')!;
  
  const event = stripe.webhooks.constructEvent(
    body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  );
  
  switch (event.type) {
    case 'payment_intent.succeeded':
      // Handle successful payment
      await handlePaymentSuccess(event.data.object);
      break;
    
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
  
  return Response.json({ received: true });
}
```

## 9. Monitoring & Analytics

### Step 1: Google Analytics Setup
```typescript
// lib/gtag.ts
export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;

export const pageview = (url: string) => {
  if (typeof window !== 'undefined') {
    window.gtag('config', GA_TRACKING_ID, {
      page_path: url,
    });
  }
};

export const event = ({ action, category, label, value }: any) => {
  if (typeof window !== 'undefined') {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
};
```

### Step 2: Sentry Error Monitoring
```bash
npm install @sentry/nextjs
```

**Configure Sentry:**
```javascript
// sentry.client.config.js
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
});
```

### Step 3: Performance Monitoring
```typescript
// lib/monitoring.ts
export function trackPerformance(metricName: string, value: number) {
  // Track custom metrics
  if (typeof window !== 'undefined' && 'gtag' in window) {
    window.gtag('event', 'timing_complete', {
      name: metricName,
      value: Math.round(value),
    });
  }
}

// Track page load times
export function trackPageLoad() {
  if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
      const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
      trackPerformance('page_load_time', loadTime);
    });
  }
}
```

## 10. Security Configuration

### Step 1: Security Headers
Already configured in `vercel.json`, includes:
- X-Frame-Options
- X-Content-Type-Options
- Referrer-Policy
- Permissions-Policy

### Step 2: Content Security Policy
```typescript
// next.config.mjs
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `
              default-src 'self';
              script-src 'self' 'unsafe-eval' 'unsafe-inline' *.vercel.app *.google-analytics.com *.stripe.com;
              style-src 'self' 'unsafe-inline' *.googleapis.com;
              img-src 'self' data: *.supabase.co *.vercel.app;
              font-src 'self' *.googleapis.com;
              connect-src 'self' *.supabase.co *.vercel.app *.stripe.com *.google-analytics.com;
            `.replace(/\s{2,}/g, ' ').trim()
          }
        ]
      }
    ];
  }
};
```

### Step 3: Rate Limiting
```typescript
// lib/rate-limit.ts
import { LRUCache } from 'lru-cache';

const rateLimit = new LRUCache({
  max: 500,
  ttl: 60000, // 1 minute
});

export function isRateLimited(identifier: string, limit: number = 10) {
  const count = rateLimit.get(identifier) || 0;
  
  if (count >= limit) {
    return true;
  }
  
  rateLimit.set(identifier, count + 1);
  return false;
}
```

## 11. Performance Optimization

### Step 1: Image Optimization
```typescript
// next.config.mjs
const nextConfig = {
  images: {
    domains: ['your-supabase-project.supabase.co'],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },
};
```

### Step 2: Bundle Analysis
```bash
# Install bundle analyzer
npm install --save-dev @next/bundle-analyzer

# Analyze bundle
npm run analyze
```

### Step 3: Caching Strategy
```typescript
// lib/cache.ts
import { unstable_cache } from 'next/cache';

export const getCachedProducts = unstable_cache(
  async () => {
    // Fetch products from database
    return products;
  },
  ['marketplace-products'],
  { revalidate: 300 } // 5 minutes
);
```

## 12. Backup & Recovery

### Step 1: Database Backups
Supabase provides automatic backups, but set up additional ones:

```bash
# Manual backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Automated backup script (cron job)
0 2 * * * /path/to/backup-script.sh
```

### Step 2: Code Repository Backup
- Ensure code is backed up on GitHub
- Set up multiple remotes if needed
- Tag releases for easy rollback

### Step 3: Environment Configuration Backup
- Export environment variables
- Document all configuration
- Store credentials securely

## 13. Testing & Quality Assurance

### Step 1: Run Full Test Suite
```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Performance tests
npm run test:performance
```

### Step 2: Manual Testing Checklist
- [ ] User registration and login
- [ ] File upload and analysis
- [ ] Quote generation
- [ ] Payment processing
- [ ] Order management
- [ ] Email notifications
- [ ] Mobile responsiveness
- [ ] Cross-browser compatibility

### Step 3: Load Testing
```bash
# Install load testing tool
npm install -g artillery

# Run load test
artillery run load-test.yml
```

## 14. Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrations completed
- [ ] Email templates tested
- [ ] Payment integration verified
- [ ] Security headers configured
- [ ] Performance optimizations applied
- [ ] Monitoring tools configured

### Deployment
- [ ] Deploy to staging first
- [ ] Run smoke tests on staging
- [ ] Deploy to production
- [ ] Verify all services working
- [ ] Check error logs
- [ ] Test critical user flows

### Post-Deployment
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Verify payment processing
- [ ] Test email delivery
- [ ] Monitor user feedback
- [ ] Set up alerts for issues

## 🚨 Common Issues & Solutions

### Issue: File Upload Fails
**Solution:**
```typescript
// Increase body size limit
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '100mb',
    },
  },
};
```

### Issue: Database Connection Timeouts
**Solution:**
- Enable connection pooling in Supabase
- Use connection limits in application
- Implement retry logic

### Issue: Email Not Sending
**Solution:**
- Check SMTP credentials
- Verify sender domain authentication
- Check rate limits

### Issue: Payment Webhooks Failing
**Solution:**
- Verify webhook endpoint URL
- Check webhook secret
- Implement idempotency

## 📊 Monitoring Dashboard

Set up monitoring for:
- **Uptime**: Use UptimeRobot or Pingdom
- **Performance**: Monitor Core Web Vitals
- **Errors**: Track error rates in Sentry
- **Business Metrics**: Monitor orders, revenue, user signups

## 🎯 Launch Strategy

### Soft Launch
1. Deploy to production
2. Test with limited users
3. Monitor closely for issues
4. Gather feedback

### Public Launch
1. Announce on social media
2. Update documentation
3. Monitor increased traffic
4. Be ready for scaling

### Post-Launch
1. Continuous monitoring
2. Regular updates
3. User feedback collection
4. Performance optimization

---

## 🎉 Congratulations!

Your REYAL 3D Printing platform is now live in production! 

**Next steps:**
- Monitor your application closely
- Gather user feedback
- Plan feature updates
- Scale based on demand

**Support Resources:**
- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)

🚀 **Your production deployment is complete and ready for users!**