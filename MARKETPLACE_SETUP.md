# 🏪 Marketplace Database Integration Setup

This document provides complete instructions for setting up the marketplace database integration for the REYAL 3D Printing Platform.

## 📋 Overview

The marketplace has been migrated from static hardcoded data to a fully dynamic database-driven system using Supabase. This includes:

- Complete marketplace products table with comprehensive metadata
- Product categories, reviews, and wishlist functionality  
- Advanced search and filtering capabilities
- API endpoints for all marketplace operations
- Seed data with realistic product information
- Image handling and placeholder management

## 🗄️ Database Setup

### 1. Run Main Schema
First, ensure the main database schema is applied:
```sql
-- Run this in Supabase SQL Editor
\i database/schema.sql
```

### 2. Apply Marketplace Complete Setup
Run the complete marketplace setup (includes schema + seed data):
```sql
-- Run this in Supabase SQL Editor  
\i database/marketplace_complete_setup.sql
```

### 3. Add Seed Data
Populate with realistic marketplace products:
```sql
-- Run this in Supabase SQL Editor
\i database/marketplace_seed.sql
```

## 🔧 Manual Database Setup Steps

If you prefer to run commands manually:

### 1. Create Tables
The following tables will be created:
- `marketplace_products` - Main products table
- `product_categories` - Product categories
- `product_reviews` - Product reviews and ratings
- `product_downloads` - Download tracking
- `user_wishlists` - User favorite products

### 2. Create Functions
Advanced functions for marketplace operations:
- `increment_product_view_count()` - Track product views
- `get_featured_products()` - Get featured products
- `get_trending_products()` - Get trending products  
- `search_marketplace_products()` - Advanced search with ranking

### 3. Set Up RLS Policies
Row Level Security policies ensure:
- Public can view active/approved products
- Users can manage their own products
- Admins have full access
- Secure review and wishlist access

## 🌐 API Endpoints

The following API endpoints are available:

### Marketplace Products
- `GET /api/marketplace` - Get products with filtering/sorting
- `GET /api/marketplace/filters` - Get available filters
- `GET /api/marketplace/stats` - Get marketplace statistics

### Parameters for `/api/marketplace`:
- `category` - Filter by category
- `search` - Search in title/description
- `minPrice` / `maxPrice` - Price range filtering
- `tags` - Filter by tags (multiple)
- `sortBy` - Sort order (popular, price-low, price-high, rating, newest)
- `page` / `limit` - Pagination

## 🎨 Frontend Integration

### Marketplace Page Updates
The marketplace page (`/app/marketplace/page.tsx`) has been completely rewritten to:

- Fetch products from API instead of static data
- Handle loading states and error conditions
- Support real-time filtering and searching
- Implement infinite scroll pagination
- Handle missing images with proper fallbacks

### Image Handling
- Products use `preview_images` array for multiple product images
- Fallback to placeholder image for missing/broken images
- Proper error handling for image loading failures

## 📊 Seed Data

The seed data includes:

### Products (16 realistic items)
- **Accessories**: Phone stands, keychains, phone cases
- **Office**: Desk organizers, pen holders, cable management
- **Home**: Plant pots, jewelry boxes, bookends, kitchen tools
- **Gaming**: Headset stands with RGB compatibility
- **Art**: Vases, sculptures with artistic designs
- **Tools**: Precision organizers for workshops
- **Automotive**: Car phone mounts

### Categories (10 categories)
- Accessories, Office & Workspace, Figurines & Models
- Home & Living, Gaming & Entertainment, Tools & Hardware
- Art & Sculpture, Automotive, Educational, Prototyping

### Reviews & Ratings
- Sample reviews for featured products
- Realistic rating distributions
- Verified purchase indicators

## 🔍 Search & Filtering

### Advanced Search Features
- Full-text search across title, description, short description
- Relevance scoring for search results
- Category-based filtering
- Price range filtering
- Tag-based filtering
- Multiple sorting options

### Performance Optimization
- Proper database indexes for fast queries
- GIN indexes for array fields (tags)
- Composite indexes for common filter combinations
- Full-text search indexes for content

## 🚀 Testing the Integration

### 1. Verify Database Setup
```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%marketplace%';

-- Check product count
SELECT COUNT(*) FROM marketplace_products WHERE is_active = true;
```

### 2. Test API Endpoints
```bash
# Get all products
curl "http://localhost:3000/api/marketplace"

# Search products  
curl "http://localhost:3000/api/marketplace?search=phone&category=Accessories"

# Get filters
curl "http://localhost:3000/api/marketplace/filters"

# Get stats
curl "http://localhost:3000/api/marketplace/stats"
```

### 3. Test Frontend
1. Navigate to `/marketplace`
2. Verify products load from database
3. Test search functionality
4. Test category filtering
5. Test price range filtering
6. Test sorting options
7. Test infinite scroll

## 🔐 Security Considerations

### Row Level Security (RLS)
All tables have proper RLS policies:
- Public read access for approved products only
- User ownership for product management
- Admin override capabilities

### Data Validation
- Server-side validation for all inputs
- SQL injection prevention
- XSS protection for user content

## 🎯 Next Steps

### Additional Features to Implement
1. **Product Detail Pages** - Individual product pages with full information
2. **Shopping Cart Integration** - Add products to cart for purchasing
3. **User Product Uploads** - Allow users to sell their own designs
4. **Advanced Analytics** - Track user behavior and popular products
5. **Recommendation Engine** - Suggest related products
6. **Bulk Operations** - Admin tools for managing multiple products

### Performance Improvements
1. **Caching** - Implement Redis for frequently accessed data
2. **CDN** - Use CDN for product images
3. **Search Optimization** - Implement Elasticsearch for better search
4. **Database Optimization** - Monitor and optimize slow queries

## 🐛 Troubleshooting

### Common Issues

**Products not loading:**
- Check database connection
- Verify RLS policies are correct
- Check API endpoint responses

**Images not showing:**
- Verify image URLs in database
- Check placeholder image exists
- Review error handling in frontend

**Search not working:**
- Check full-text search indexes
- Verify search function exists
- Test with simple queries first

**Filters not working:**
- Check API parameter handling
- Verify filter data structure
- Test individual filter types

### Debug Commands
```sql
-- Check product data
SELECT id, title, category, is_active, is_approved FROM marketplace_products LIMIT 5;

-- Check categories
SELECT * FROM product_categories WHERE is_active = true;

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'marketplace_products';
```

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review database logs in Supabase dashboard
3. Check API response headers for detailed error messages
4. Verify environment variables are set correctly

The marketplace is now fully database-driven and production-ready! 🎉