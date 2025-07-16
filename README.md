# REYAL 3D Printing Website

A comprehensive 3D printing service platform built with Next.js 15, featuring dark theme UI, protected model viewing, and full integration with Supabase and Vercel.

## 🚀 Features

### Frontend
- **Dark Theme**: Uniform dark theme across all pages with emerald/green color palette
- **Protected Model Viewer**: DRM-enabled 3D model viewer with access controls
- **Responsive Design**: Mobile-first design that works across all devices
- **Interactive UI**: Modern UI components with animations and transitions

### Backend
- **File Upload & Analysis**: Support for STL, OBJ, 3MF, PLY files with automatic analysis
- **Cost Calculation**: Real-time pricing based on material, quality, and complexity
- **Order Management**: Complete order lifecycle from quote to delivery
- **User Authentication**: Secure authentication with Supabase

### Security & DRM
- **Model Protection**: Watermarking, screenshot prevention, access controls
- **User Tracking**: View time limits and session monitoring
- **Secure Storage**: Protected file storage with access controls
- **Authentication**: JWT-based authentication with role-based access

### Testing
- **Comprehensive Test Suite**: 142+ tests covering API, integration, and UI
- **End-to-End Testing**: Playwright tests for user journeys
- **Performance Testing**: Load time and responsiveness validation
- **Accessibility Testing**: WCAG compliance verification

## 🛠️ Tech Stack

- **Framework**: Next.js 15 with App Router
- **UI**: Tailwind CSS with Radix UI components
- **3D Rendering**: Three.js for model visualization
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **File Storage**: Supabase Storage
- **Deployment**: Vercel
- **Testing**: Jest, Playwright, Testing Library

## 📦 Installation

1. Clone the repository:
```bash
git clone https://github.com/r3tr056/reyal-web.git
cd reyal-web
```

2. Install dependencies:
```bash
npm install --legacy-peer-deps
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Configure environment variables in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```

5. Run the development server:
```bash
npm run dev
```

## 🧪 Testing

### Unit & Integration Tests
```bash
npm test
npm run test:coverage
```

### End-to-End Tests
```bash
npm run test:e2e
npm run test:e2e:ui
```

### Run All Tests
```bash
npm run test:all
```

## 🚀 Deployment

### Vercel Deployment
1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Production Checklist
- [x] Environment variables configured
- [x] Database migrations applied
- [x] File storage buckets created
- [x] Domain and SSL configured
- [x] Performance monitoring enabled
- [x] Error tracking configured

## 📁 Project Structure

```
reyal-web/
├── app/                    # Next.js app router pages
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── marketplace/       # Marketplace page
│   ├── cart/              # Shopping cart
│   ├── orders/            # Order management
│   └── profile/           # User profile
├── components/            # Reusable UI components
│   ├── ui/               # Base UI components
│   ├── layout/           # Layout components
│   └── model-viewer/     # 3D model viewer
├── contexts/             # React contexts
├── lib/                  # Utility functions
├── tests/                # Test suites
│   ├── unit/            # Unit tests
│   ├── integration/     # Integration tests
│   └── e2e/             # End-to-end tests
└── public/              # Static assets
```

## 🔧 Configuration

### Dark Theme
The application uses a forced dark theme with emerald/green primary colors. Theme configuration is in:
- `app/layout.tsx` - Theme provider setup
- `app/globals.css` - CSS custom properties
- `tailwind.config.ts` - Tailwind theme configuration

### Protected Model Viewer
The DRM-enabled model viewer supports three access levels:
- **Preview**: Wireframe view, time-limited, watermarked
- **Full**: Solid view, basic interactions
- **Premium**: High-quality view, full controls, download allowed

### API Endpoints
- `POST /api/upload` - File upload
- `POST /api/analyze/:fileId` - Model analysis
- `POST /api/calculate-cost` - Cost calculation
- `POST /api/generate-quote` - Quote generation
- `GET /api/orders` - Order listing
- `GET /api/materials` - Material catalog

## 🔒 Security Features

### Model Protection
- Watermarking with user identification
- Screenshot prevention
- Right-click protection
- View time limiting
- Session tracking

### API Security
- JWT authentication
- Rate limiting
- Input validation
- SQL injection prevention
- CORS configuration

### Data Protection
- Encrypted file storage
- Secure API endpoints
- User data privacy
- GDPR compliance ready

## 📊 Performance

### Optimization
- Image optimization with Next.js
- Code splitting and lazy loading
- CDN delivery via Vercel
- Database query optimization
- Caching strategies

### Monitoring
- Web Vitals tracking
- Error monitoring
- Performance metrics
- User analytics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License. See LICENSE file for details.

## 🆘 Support

For support and questions:
- Email: support@reyal.com
- Documentation: [docs.reyal.com](https://docs.reyal.com)
- Issues: [GitHub Issues](https://github.com/r3tr056/reyal-web/issues)

---

Built with ❤️ by the REYAL team