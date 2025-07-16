# REYAL - Professional 3D Printing Services

A modern, production-ready Next.js application for professional 3D printing services. Built with cutting-edge technology to provide seamless file upload, analysis, quoting, and order management.

## 🚀 Features

### Core Functionality
- **3D Model Upload & Analysis** - Support for STL, OBJ, 3MF, PLY files
- **Intelligent Cost Calculation** - Real-time pricing based on material, quality, and complexity
- **Quote Generation** - Professional quotes with detailed breakdowns
- **Shopping Cart & Checkout** - Complete e-commerce functionality
- **Order Tracking** - Real-time order status and history
- **User Authentication** - Secure login with Supabase Auth

### Admin Dashboard
- **Order Management** - Track and update order statuses
- **User Management** - Manage customer accounts
- **Analytics** - Business insights and reporting
- **Material Management** - Configure pricing and availability
- **Print Job Queue** - Production workflow management

### Technical Features
- **Next.js 15** with App Router and Server Components
- **TypeScript** for type safety
- **Supabase** for authentication, database, and storage
- **Tailwind CSS** with modern design system
- **Radix UI** components for accessibility
- **Docker** containerization
- **Vercel-ready** deployment

## 🛠️ Technology Stack

- **Frontend:** Next.js 15, React 19, TypeScript
- **Styling:** Tailwind CSS, Radix UI
- **Backend:** Next.js API Routes
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **Storage:** Local/Supabase Storage
- **Deployment:** Docker, Vercel
- **State Management:** React Context
- **Forms:** React Hook Form, Zod validation

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account (optional for demo)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/r3tr056/reyal-web.git
   cd reyal-web
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file with the following:

```bash
# Supabase (optional for demo)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# File Upload
MAX_FILE_SIZE=50000000
ALLOWED_FILE_TYPES=.stl,.obj,.3mf,.ply
```

### Database Setup

If using Supabase:
1. Create a new project at [supabase.com](https://supabase.com)
2. Run the SQL schema from `database/schema.sql`
3. Configure Row Level Security policies (included in schema)

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Docker
```bash
# Build and run
docker build -t reyal-3d-printing .
docker run -p 3000:3000 -v $(pwd)/uploads:/app/uploads reyal-3d-printing

# Or use Docker Compose
docker-compose up -d
```

### Manual Deployment
```bash
npm run build
npm start
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## 📁 Project Structure

```
reyal-web/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── admin/             # Admin dashboard
│   ├── auth/              # Authentication pages
│   ├── (pages)/           # Public pages
│   └── layout.tsx         # Root layout
├── components/            # Reusable components
│   ├── ui/               # Base UI components
│   └── layout/           # Layout components
├── contexts/             # React contexts
├── lib/                  # Utilities and configurations
│   ├── supabase/         # Supabase client setup
│   └── types.ts          # TypeScript types
├── database/             # Database schema
├── uploads/              # File upload directory
├── public/               # Static assets
├── styles/               # Global styles
└── docker/               # Docker configuration
```

## 🧪 API Documentation

### Authentication Required
All API endpoints require authentication except:
- `GET /api/health` - Health check
- `GET /api/materials` - Get available materials

### File Management
- `POST /api/upload` - Upload 3D model file
- `POST /api/analyze/[fileId]` - Analyze uploaded file

### Pricing & Quotes
- `POST /api/calculate-cost` - Calculate printing cost
- `POST /api/generate-quote` - Generate formal quote

### E-commerce
- `GET /api/cart` - Get cart items
- `POST /api/cart` - Add item to cart
- `DELETE /api/cart?itemId=id` - Remove cart item
- `GET /api/orders` - Get user orders
- `POST /api/orders` - Create new order

## 🎨 Design System

The application uses a custom design system built on Tailwind CSS:

### Colors
- **Primary:** Emerald/Green gradient scheme
- **Background:** Dark theme with gray-950 base
- **Text:** White/gray hierarchy for readability

### Components
- **Cards:** Glass-morphism effects with backdrop blur
- **Buttons:** Gradient backgrounds with hover animations
- **Forms:** Consistent styling with validation states
- **Navigation:** Modern header with user authentication

## 🧩 Key Components

### File Upload
- Drag & drop interface
- File type validation
- Progress indicators
- Error handling

### 3D Model Analysis
- Mock analysis for demonstration
- Volume, surface area calculations
- Complexity assessment
- Support requirement detection

### Cost Calculator
- Material-based pricing
- Quality multipliers
- Rush order pricing
- Tax calculations

### Shopping Experience
- Add to cart functionality
- Quantity management
- Checkout process
- Order confirmation

## 🔒 Security Features

- **Row Level Security (RLS)** on all database tables
- **Input validation** on all forms and APIs
- **File type restrictions** for uploads
- **Authentication middleware** for protected routes
- **CSRF protection** via Next.js
- **Environment variable protection**

## 🚦 Development

### Available Scripts
```bash
npm run dev         # Start development server
npm run build       # Build for production
npm run start       # Start production server
npm run lint        # Run ESLint
npm run type-check  # Check TypeScript types
```

### Adding New Features
1. Create components in `/components`
2. Add API routes in `/app/api`
3. Update types in `/lib/types.ts`
4. Add database migrations if needed

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is proprietary software for REYAL 3D Printing Services.

## 🆘 Support

For support, email [support@reyal.in](mailto:support@reyal.in) or create an issue in the repository.

## 🔄 Roadmap

- [ ] Real 3D model processing integration
- [ ] Payment gateway integration
- [ ] Advanced admin analytics
- [ ] Mobile app development
- [ ] API rate limiting
- [ ] Advanced search and filtering
- [ ] Multi-language support
- [ ] 3D model preview widget

---

Built with ❤️ by the REYAL Team