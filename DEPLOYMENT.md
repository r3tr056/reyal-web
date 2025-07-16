# REYAL 3D Printing Website - Deployment Guide

## Overview
This is a production-ready Next.js application for a 3D printing service, featuring file upload, 3D model analysis, cost calculation, quote generation, and order management.

## Features
- 🚀 Next.js 15 with App Router
- 🔐 Supabase Authentication & Database
- 📁 File Upload & 3D Model Processing
- 💰 Cost Calculation & Quote Generation
- 🛒 Shopping Cart & Order Management
- 📊 Admin Dashboard
- 🐳 Docker Support
- ☁️ Vercel-ready Deployment

## Environment Variables

Create a `.env.local` file with the following variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# File Upload Configuration
MAX_FILE_SIZE=50000000
ALLOWED_FILE_TYPES=.stl,.obj,.3mf,.ply

# Pricing Configuration
BASE_MATERIAL_PRICE=35
QUALITY_MULTIPLIER_DRAFT=0.7
QUALITY_MULTIPLIER_STANDARD=1.0
QUALITY_MULTIPLIER_HIGH=1.4
QUALITY_MULTIPLIER_ULTRA=2.0
```

## Database Setup

1. Create a new Supabase project
2. Run the SQL schema from `database/schema.sql` in your Supabase SQL editor
3. Enable Row Level Security (RLS) - it's included in the schema
4. Set up Supabase Storage bucket named `3d-models` (optional, currently using local file storage)

## Deployment Options

### 1. Vercel Deployment (Recommended)

1. **Connect to GitHub:**
   - Push your code to GitHub
   - Connect your GitHub repository to Vercel

2. **Environment Variables:**
   - Add all environment variables in Vercel dashboard
   - Ensure `NEXT_PUBLIC_APP_URL` points to your Vercel domain

3. **Deploy:**
   ```bash
   npm run build
   ```

4. **Custom Domain (Optional):**
   - Add your custom domain in Vercel dashboard
   - Update `NEXT_PUBLIC_APP_URL` accordingly

### 2. Docker Deployment

#### Build and run locally:
```bash
# Build the Docker image
docker build -t reyal-3d-printing .

# Run the container
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=your-supabase-url \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key \
  -e SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
  -e NEXT_PUBLIC_APP_URL=http://localhost:3000 \
  -v $(pwd)/uploads:/app/uploads \
  reyal-3d-printing
```

#### Using Docker Compose:
```bash
# Copy environment variables
cp .env.example .env.local
# Edit .env.local with your actual values

# Start services
docker-compose up -d

# With production profile (includes nginx)
docker-compose --profile production up -d
```

### 3. Traditional Server Deployment

#### Prerequisites:
- Node.js 18+
- PM2 (process manager)
- Nginx (reverse proxy)

#### Steps:
```bash
# Install dependencies
npm install --production

# Build the application
npm run build

# Install PM2 globally
npm install -g pm2

# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'reyal-3d-printing',
    script: 'npm',
    args: 'start',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
EOF

# Start with PM2
pm2 start ecosystem.config.js
```

## File Storage Configuration

### Option 1: Local File Storage (Current Implementation)
- Files are stored in `/uploads` directory
- Ensure proper permissions: `chmod 755 uploads`
- For Docker: Use volume mounting

### Option 2: Supabase Storage (Recommended for Production)
1. Create a storage bucket named `3d-models` in Supabase
2. Update the upload API to use Supabase Storage instead of local storage
3. Configure proper access policies

### Option 3: AWS S3 / Google Cloud Storage
- Implement cloud storage adapter in the upload API
- Update environment variables accordingly

## Production Checklist

### Security
- [ ] Enable HTTPS/SSL
- [ ] Set up proper CORS policies
- [ ] Configure CSP headers
- [ ] Enable rate limiting
- [ ] Set up monitoring and alerting

### Performance
- [ ] Configure CDN (Vercel handles this automatically)
- [ ] Set up proper caching headers
- [ ] Optimize images and assets
- [ ] Monitor performance metrics

### Database
- [ ] Set up database backups
- [ ] Configure connection pooling
- [ ] Monitor database performance
- [ ] Set up proper indexes

### Monitoring
- [ ] Set up error tracking (Sentry)
- [ ] Configure uptime monitoring
- [ ] Set up log aggregation
- [ ] Monitor resource usage

## API Endpoints

### Public Endpoints
- `GET /api/health` - Health check
- `GET /api/materials` - Get available materials

### Authenticated Endpoints
- `POST /api/upload` - Upload 3D model file
- `POST /api/analyze/[fileId]` - Analyze uploaded file
- `POST /api/calculate-cost` - Calculate printing cost
- `POST /api/generate-quote` - Generate quote
- `GET /api/cart` - Get cart items
- `POST /api/cart` - Add item to cart
- `DELETE /api/cart` - Remove cart item
- `GET /api/orders` - Get user orders
- `POST /api/orders` - Create new order

## Troubleshooting

### Common Issues

1. **Build Failures:**
   - Check TypeScript errors: `npm run type-check`
   - Verify all environment variables are set
   - Ensure Node.js version compatibility

2. **Database Connection Issues:**
   - Verify Supabase URL and keys
   - Check network connectivity
   - Validate database schema

3. **File Upload Issues:**
   - Check file permissions in uploads directory
   - Verify file size limits
   - Ensure supported file types

4. **Docker Issues:**
   - Check Docker daemon is running
   - Verify port availability
   - Check volume mounting permissions

### Support
For technical support, check the logs and error messages:

```bash
# View application logs
docker logs container_name

# PM2 logs
pm2 logs

# Check Next.js build logs
npm run build 2>&1 | tee build.log
```

## License
This project is proprietary software for REYAL 3D Printing Services.