# OrganicTrace - Blockchain-Powered Organic Product Traceability

A comprehensive platform for tracking organic products from farm to consumer with complete transparency and authenticity verification.

## Features

### 1. Traceability Mechanism
- Complete product lifecycle tracking from harvest to retail
- Recording of farming practices, processing, distribution, and retail stages
- Immutable movement history for each product
- Environmental data tracking (temperature, humidity)

### 2. Certification Verification
- Secure storage and verification of organic certifications
- Support for multiple certification bodies and standards
- Expiry date tracking and validation
- Issuer verification and credential management

### 3. Consumer Engagement Platform
- QR code scanning for instant product information
- Complete supply chain visualization
- Farmer and processor information display
- Real-time certification status

### 4. Role-Based Dashboards
- **Farmers**: Create products, manage certifications, track shipments
- **Processors**: Receive products, record processing activities, transfer to retailers
- **Consumers**: Verify products, view certifications, track origin

## Technology Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Backend**: Next.js API Routes, Server Actions
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Security**: Row-Level Security (RLS) policies

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Vercel account (for deployment)

### Installation

1. **Clone the repository**
\`\`\`bash
git clone <repository-url>
cd organic-product-tracker
\`\`\`

2. **Install dependencies**
\`\`\`bash
npm install
\`\`\`

3. **Set up environment variables**

Create a `.env.local` file with:
\`\`\`
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000
\`\`\`

4. **Set up the database**

The database schema is defined in `scripts/001_init-schema.sql`. Run this script in your Supabase SQL editor to create all necessary tables and policies.

5. **Run the development server**
\`\`\`bash
npm run dev
\`\`\`

Visit http://localhost:3000 to see the application.

## Project Structure

\`\`\`
app/
├── auth/                          # Authentication pages
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   └── signup-success/page.tsx
├── dashboard/                     # User dashboards
│   ├── page.tsx
│   ├── create-product/page.tsx
│   └── add-certification/page.tsx
├── product/                       # Product pages
│   ├── page.tsx
│   └── [id]/page.tsx
├── api/                           # API routes
│   ├── products/
│   ├── certifications/
│   └── ...
├── globals.css                    # Global styles
└── layout.tsx                     # Root layout

lib/
├── supabase/
│   ├── client.ts                 # Client-side Supabase
│   ├── server.ts                 # Server-side Supabase
│   └── middleware.ts             # Authentication middleware
├── auth.ts                        # Auth utilities
└── blockchain.ts                 # Blockchain interactions

components/
├── ui/                            # shadcn/ui components
└── dashboards/                    # Role-specific dashboards
    ├── farmer-dashboard.tsx
    ├── processor-dashboard.tsx
    └── consumer-dashboard.tsx

scripts/
└── 001_init-schema.sql           # Database schema
\`\`\`

## Database Schema

The system uses Supabase PostgreSQL with Row-Level Security (RLS):

### Tables

1. **profiles**: User profiles with role information
2. **certifications**: Organic certifications with verification status
3. **products**: Product records with farmer and ownership information
4. **product_movements**: Supply chain movement history

## User Workflows

### Farmer Workflow
1. Create account and register as farmer
2. Add organic certifications
3. Create new products with farming practices
4. Track product transfers to processors

### Processor Workflow
1. Create account and register as processor
2. Receive products from farmers
3. Record processing activities
4. Transfer processed products to retailers

### Consumer Workflow
1. Access public product search
2. Scan QR codes or enter product IDs
3. View complete product history
4. Verify organic certifications

## API Endpoints

### Products
- `GET /api/products/[id]` - Get product details
- `POST /api/products` - Create new product
- `POST /api/products/[id]/transfer` - Transfer product ownership

### Certifications
- `POST /api/certifications/verify` - Verify certifications

### Authentication
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout

## Security Considerations

1. **Authentication**: Supabase Auth with email/password
2. **Data Encryption**: Sensitive data encrypted at rest in Supabase
3. **Session Management**: Secure cookie-based sessions
4. **CORS**: Properly configured for API security

## Deployment

### Deploy to Vercel

1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically on push

\`\`\`bash
vercel deploy
\`\`\`

## Contributing

Contributions are welcome! Please follow these guidelines:
1. Create a feature branch
2. Make your changes
3. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For support, please contact support@organictrace.com or create an issue on GitHub.

## Roadmap

- QR code generation for products
- Blockchain integration with smart contracts
- Mobile app (iOS/Android)
- Advanced analytics and reporting
- Integration with major organic certification bodies
- Multi-language support
