# Organic Product Tracker - Blockchain Deployment Guide

This guide covers deploying the smart contracts to the Sepolia test network and configuring your Next.js application.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Smart Contracts Overview](#smart-contracts-overview)
- [Local Testing](#local-testing)
- [Sepolia Testnet Deployment](#sepolia-testnet-deployment)
- [Contract Verification](#contract-verification)
- [Next.js Integration](#nextjs-integration)
- [Testing with MetaMask](#testing-with-metamask)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

1. **Node.js** (v16 or higher)
   \`\`\`bash
   node --version
   \`\`\`

2. **Hardhat** (will be installed via npm)
   \`\`\`bash
   npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
   \`\`\`

### Accounts & Keys

1. **MetaMask Account**
   - [Download MetaMask](https://metamask.io/)
   - Create account and set up Sepolia testnet
   - Get test ETH from [Sepolia Faucet](https://sepoliafaucet.com/)

2. **Alchemy or Infura Account** (for RPC URL)
   - [Alchemy](https://www.alchemy.com/) - Recommended
   - [Infura](https://www.infura.io/)

3. **Etherscan Account** (for contract verification)
   - [Etherscan Sepolia](https://sepolia.etherscan.io/)
   - Get API key from your profile

---

## Smart Contracts Overview

### CertificationRegistry.sol

**Purpose**: Verifies organic certifications for farmers

**Key Functions**:
- `addCertifier(address)` - Admin adds an approved certifier
- `grantCertification(address, expiryDate, body)` - Certifier grants certification
- `verify(address)` - Anyone can verify if farmer is certified
- `getCertification(address)` - Get detailed certification info
- `revokeCertification(address)` - Certifier revokes certification

**State**:
- Admin: Only account that deployed the contract
- Certifiers: Map of approved certification bodies
- Farmers: Map of farmer addresses to certification data

### ProductTracker.sol

**Purpose**: Creates digital passport for products and tracks lifecycle

**Key Functions**:
- `createProduct(name, parentId, details)` - Certified farmer creates product
- `transferProduct(id, newOwner, action, details)` - Transfer product ownership
- `getProduct(id)` - Get complete product history
- `getFarmerProducts(address)` - Get all products from farmer

**Constraints**:
- Only certified farmers (verified via CertificationRegistry) can create products
- Each product has immutable history of transfers
- Product ownership can be transferred step-by-step through supply chain

---

## Local Testing

### 1. Install Dependencies

\`\`\`bash
npm install
\`\`\`

### 2. Run Local Tests

Test all contracts:
\`\`\`bash
npx hardhat test
\`\`\`

Test specific contract:
\`\`\`bash
npx hardhat test test/CertificationRegistry.test.ts
npx hardhat test test/ProductTracker.test.ts
\`\`\`

Test with gas reporting:
\`\`\`bash
REPORT_GAS=true npx hardhat test
\`\`\`

### 3. Run Local Node

Open terminal 1:
\`\`\`bash
npx hardhat node
\`\`\`

Open terminal 2:
\`\`\`bash
npx hardhat run scripts/deploy.ts --network localhost
\`\`\`

---

## Sepolia Testnet Deployment

### 1. Get Sepolia Test ETH

Visit [Sepolia Faucet](https://sepoliafaucet.com/) and get free test ETH

### 2. Set Up Environment Variables

Create `.env` file in project root:

\`\`\`bash
# Get from Alchemy Dashboard: https://dashboard.alchemy.com/
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY

# Export private key from MetaMask:
# 1. Click account icon
# 2. Click "Account details"
# 3. Click "Export Private Key"
# ⚠️ NEVER commit this to git or share publicly!
PRIVATE_KEY=0x...

# Get from Etherscan: https://sepolia.etherscan.io/apis
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY
\`\`\`

### 3. Deploy Contracts

\`\`\`bash
npx hardhat run scripts/deploy.ts --network sepolia
\`\`\`

**Expected Output**:
\`\`\`
🚀 Deploying OrganicTrace Contracts...

📍 Network: sepolia (Chain ID: 11155111)
👤 Deployer: 0x...

💰 Account balance: 0.5 ETH

📋 Deploying CertificationRegistry...
✅ CertificationRegistry deployed to: 0x...

📦 Deploying ProductTracker...
✅ ProductTracker deployed to: 0x...

📝 Contract Addresses:
═══════════════════════════════════════════
CERT_REGISTRY_ADDRESS=0x...
PRODUCT_TRACKER_ADDRESS=0x...
═══════════════════════════════════════════
\`\`\`

### 4. Save Contract Addresses

Copy the contract addresses and add to your `.env.local`:

\`\`\`bash
NEXT_PUBLIC_CERT_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_PRODUCT_TRACKER_ADDRESS=0x...
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
\`\`\`

---

## Contract Verification

After deployment to Sepolia, contracts are automatically verified if deployment succeeds.

### Manual Verification

If automatic verification fails, verify manually on Etherscan:

1. Go to [Sepolia Etherscan](https://sepolia.etherscan.io/)
2. Search for your contract address
3. Click "Code" tab
4. Scroll to "Contract Creator Code Verification"
5. Choose "Solidity (Multi-file)" compiler
6. Select matching compiler version (0.8.20)
7. Select optimization (Yes, 200 runs)
8. Paste `contracts/CertificationRegistry.sol` and `contracts/ProductTracker.sol` code
9. Verify

---

## Next.js Integration

### 1. Update Environment Variables

In your `.env.local`:

\`\`\`bash
# Blockchain Configuration
NEXT_PUBLIC_CERT_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_PRODUCT_TRACKER_ADDRESS=0x...
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY

# Ethereum Chain ID for Sepolia
NEXT_PUBLIC_CHAIN_ID=11155111

# Ethers.js uses these for read-only contract interactions
ETHEREUM_RPC_URL=$NEXT_PUBLIC_SEPOLIA_RPC_URL
\`\`\`

### 2. Contract Interaction in React

The `lib/blockchain.ts` file handles all contract interactions:

\`\`\`typescript
import { verifyCertification, getProductDetails } from "@/lib/blockchain"

// In a React component:
const isCertified = await verifyCertification(farmerAddress)
const product = await getProductDetails(productId)
\`\`\`

### 3. MetaMask Integration

Users need MetaMask to:
- Create products (write transactions)
- Transfer products (requires signing)
- Grant certifications (admin only)

---

## Testing with MetaMask

### 1. Add Sepolia to MetaMask

1. Open MetaMask
2. Click network dropdown → "Add network"
3. Enter details:
   - Network Name: Sepolia Testnet
   - RPC URL: `https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY`
   - Chain ID: `11155111`
   - Currency: ETH
   - Block Explorer: `https://sepolia.etherscan.io`

### 2. Get Test ETH

Visit [Sepolia Faucet](https://sepoliafaucet.com/) and claim test ETH

### 3. Test Farmer Workflow

1. Login with test farmer account
2. Go to Dashboard → Create Product
3. MetaMask prompts to sign transaction
4. Product created on-chain
5. Check transaction on [Sepolia Etherscan](https://sepolia.etherscan.io/)

### 4. Test Certification

As admin:
1. Add certifier address (use a different MetaMask account)
2. Grant certification to farmer
3. Verify farmer is certified

---

## Troubleshooting

### Common Issues

**"Could not find the table 'public.profiles'"**
- The Supabase database hasn't been initialized
- Run the SQL migration: `scripts/001_init-schema.sql`

**"Only certified farmers can create products"**
- Farmer needs certification first
- Admin must grant certification via CertificationRegistry

**"Error: insufficient funds for intrinsic transaction cost"**
- Account out of test ETH
- Get more from [Sepolia Faucet](https://sepoliafaucet.com/)

**"Invalid contract address"**
- Contract address not set in environment variables
- Re-run deployment and update `.env.local`

**MetaMask doesn't show contract interaction**
- Make sure Sepolia is selected in MetaMask
- Verify contract address matches environment variable

**Contract verification fails**
- Wait 30+ seconds after deployment before verification
- Ensure compiler version and optimization match

### Gas Estimation

Approximate gas costs on Sepolia:
- Deploy CertificationRegistry: ~1M gas
- Deploy ProductTracker: ~2M gas
- Create Product: ~100k gas
- Transfer Product: ~50k gas
- Grant Certification: ~80k gas

---

## Going Live (Mainnet)

⚠️ **WARNING**: Requires real ETH to deploy on mainnet

To deploy to mainnet:

1. Update `hardhat.config.js` with mainnet RPC:
   \`\`\`javascript
   mainnet: {
     url: process.env.MAINNET_RPC_URL,
     accounts: [process.env.PRIVATE_KEY],
     chainId: 1,
   }
   \`\`\`

2. Deploy with same script:
   \`\`\`bash
   npx hardhat run scripts/deploy.ts --network mainnet
   \`\`\`

3. Update environment variables to use mainnet addresses
4. Verify contracts on [Etherscan](https://etherscan.io/)

---

## Support

For issues:
1. Check [Hardhat Docs](https://hardhat.org/)
2. Check [Solidity Docs](https://docs.soliditylang.org/)
3. Ask on [Ethereum Stack Exchange](https://ethereum.stackexchange.com/)

---

## Security Notes

🔒 **Never**:
- Commit `.env` files with private keys
- Share private keys or mnemonics
- Use mainnet private keys for testnet
- Grant admin/certifier roles to untrusted accounts

✅ **Always**:
- Use testnet for development
- Verify contracts on block explorer
- Audit contracts before mainnet deployment
- Keep private keys in environment variables only
