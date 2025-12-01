# OrganicTrace

A blockchain-powered platform for tracking organic products from farm to consumer, ensuring transparency and authenticity verification.

## Purpose

OrganicTrace provides complete traceability for organic products, allowing consumers to verify the authenticity of organic certifications and track the product journey from farm to table. Key features include:

- **Traceability Mechanism**: Complete product lifecycle tracking from harvest to retail, including farming practices, processing, distribution, and retail stages, with immutable movement history and environmental data tracking.
- **Certification Verification**: Secure storage and verification of organic certifications, supporting multiple certification bodies and standards, with expiry tracking and issuer verification.
- **Consumer Engagement**: QR code scanning for instant product information, supply chain visualization, and real-time certification status.
- **Role-Based Dashboards**: Dedicated interfaces for farmers (create products, manage certifications), processors (record processing activities), and consumers (verify products and view origins).

## Technology Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Backend**: Next.js API Routes, Server Actions
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Blockchain**: Hardhat, Solidity smart contracts
- **Storage**: IPFS via Pinata for media and documents

## Workflow

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

## Locally Setup

### Prerequisites
- Node.js 18+
- npm or pnpm
- Supabase account
- Pinata account (for IPFS storage)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd organictrace
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   Create a `.env.local` file with:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000
   PINATA_API_KEY=your_pinata_api_key
   PINATA_SECRET_API_KEY=your_pinata_secret_key
   ```

4. **Set up the database**

   Run the SQL scripts in `scripts/` in order in your Supabase SQL editor to create tables and policies.

5. **Set up blockchain (optional)**

   Follow the instructions in `HARDHAT_SETUP.md` to deploy smart contracts locally.

6. **Run the development server**
   ```bash
   pnpm run dev
   ```

   Visit http://localhost:3000 to see the application.
