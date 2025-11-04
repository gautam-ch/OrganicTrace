# Hardhat Configuration & Setup Guide

## What is Hardhat?

Hardhat is a development environment for Ethereum smart contracts. It provides:

- **Local blockchain** for testing
- **Contract compilation** and optimization
- **Automated testing framework**
- **Deployment scripts**
- **Contract verification** on Etherscan

---

## Project Structure

\`\`\`
OrganicTrace/
├── contracts/
│   ├── CertificationRegistry.sol
│   └── ProductTracker.sol
├── test/
│   ├── CertificationRegistry.test.ts
│   └── ProductTracker.test.ts
├── scripts/
│   └── deploy.ts
├── artifacts/           (generated after compilation)
├── cache/              (generated compilation cache)
├── hardhat.config.js
├── tsconfig.json
└── .env               (environment variables - NOT in git)
\`\`\`

---

## Installation

### 1. Install Hardhat

\`\`\`bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox @nomicfoundation/hardhat-verify dotenv
\`\`\`

### 2. Install TypeScript Support (Optional)

\`\`\`bash
npm install --save-dev typescript @types/node @types/chai @types/mocha
npx tsc --init
\`\`\`

### 3. Verify Installation

\`\`\`bash
npx hardhat --version
\`\`\`

---

## Configuration Files

### hardhat.config.js

Main configuration file for Hardhat:

\`\`\`javascript
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL,
      accounts: [process.env.PRIVATE_KEY],
      chainId: 11155111,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};
\`\`\`

**Key Options**:
- `solidity`: Compiler version and optimization settings
- `networks`: RPC endpoints for different chains
- `etherscan`: API key for contract verification

### .env File

Create `.env` file (NOT tracked by git):

\`\`\`bash
# Sepolia RPC Endpoint
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY

# Private key to sign transactions
PRIVATE_KEY=0x...

# Etherscan API for verification
ETHERSCAN_API_KEY=YOUR_API_KEY
\`\`\`

---

## Compilation

### Compile Contracts

\`\`\`bash
npx hardhat compile
\`\`\`

Generates:
- `artifacts/contracts/CertificationRegistry.json` (ABI + bytecode)
- `artifacts/contracts/ProductTracker.json`

### Force Recompile

\`\`\`bash
npx hardhat clean
npx hardhat compile
\`\`\`

---

## Testing

### Run All Tests

\`\`\`bash
npx hardhat test
\`\`\`

### Run Specific Test File

\`\`\`bash
npx hardhat test test/CertificationRegistry.test.ts
\`\`\`

### Run With Gas Reporter

\`\`\`bash
REPORT_GAS=true npx hardhat test
\`\`\`

### Watch Mode (Re-run on changes)

\`\`\`bash
npx hardhat test --watch
\`\`\`

### Test Output Example

\`\`\`
  CertificationRegistry
    ✓ Should set the correct admin (250ms)
    ✓ Should allow admin to add certifier (180ms)
    ✓ Should emit CertifierAdded event (160ms)
    Certifier Management
      ✓ Should not allow non-admin to add certifier
    ...
  
  40 passing (5s)
\`\`\`

---

## Deployment

### Deploy to Localhost

Terminal 1 (Start local node):
\`\`\`bash
npx hardhat node
\`\`\`

Terminal 2 (Deploy):
\`\`\`bash
npx hardhat run scripts/deploy.ts --network localhost
\`\`\`

### Deploy to Sepolia

\`\`\`bash
npx hardhat run scripts/deploy.ts --network sepolia
\`\`\`

### Deploy Script (`scripts/deploy.ts`)

\`\`\`typescript
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying as: ${deployer.address}`);

  // Deploy CertificationRegistry
  const CertRegistry = await ethers.getContractFactory("CertificationRegistry");
  const certRegistry = await CertRegistry.deploy();
  await certRegistry.waitForDeployment();

  // Deploy ProductTracker
  const ProductTracker = await ethers.getContractFactory("ProductTracker");
  const productTracker = await ProductTracker.deploy(await certRegistry.getAddress());
  await productTracker.waitForDeployment();

  console.log(`CertRegistry: ${await certRegistry.getAddress()}`);
  console.log(`ProductTracker: ${await productTracker.getAddress()}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
\`\`\`

---

## Local Development Node

### Start Local Blockchain

\`\`\`bash
npx hardhat node
\`\`\`

This creates:
- **20 pre-funded test accounts** with 10,000 ETH each
- **Chain ID**: 31337 (local hardhat)
- **Runs on port**: 8545

### Import Accounts to MetaMask

Hardhat node provides private keys in console. Copy and import to MetaMask:

1. Open MetaMask
2. Add Network:
   - Name: Hardhat Local
   - RPC: http://localhost:8545
   - Chain ID: 31337
   - Currency: ETH

3. Add Account:
   - Settings → Import Account
   - Paste private key

---

## Key Tasks

### List Available Tasks

\`\`\`bash
npx hardhat
\`\`\`

### Common Tasks

\`\`\`bash
# Compile
npx hardhat compile

# Test
npx hardhat test

# Deploy
npx hardhat run scripts/deploy.ts --network sepolia

# Clean build artifacts
npx hardhat clean

# Verify contract on Etherscan
npx hardhat verify --network sepolia 0xContractAddress

# Get account balance
npx hardhat accounts
\`\`\`

---

## Environment Variables Reference

| Variable | Purpose | Example |
|----------|---------|---------|
| `SEPOLIA_RPC_URL` | Sepolia node endpoint | https://eth-sepolia.g.alchemy.com/v2/... |
| `PRIVATE_KEY` | Account private key for transactions | 0x... |
| `ETHERSCAN_API_KEY` | For contract verification | YOUR_ETHERSCAN_API_KEY |

---

## Common Errors & Solutions

| Error | Solution |
|-------|----------|
| `Error: insufficient funds` | Get test ETH from [Sepolia Faucet](https://sepoliafaucet.com/) |
| `Cannot find module 'hardhat'` | Run `npm install --save-dev hardhat` |
| `Error: Invalid private key` | Check `.env` file format, ensure `0x` prefix |
| `Contract verification failed` | Wait 30+ seconds after deployment, check compiler version |
| `RPC endpoint error` | Verify RPC URL is correct and not rate-limited |

---

## Next Steps

1. ✅ Install Hardhat and dependencies
2. ✅ Configure environment variables
3. ✅ Run tests: `npx hardhat test`
4. ✅ Start local node: `npx hardhat node`
5. ✅ Deploy to Sepolia: `npx hardhat run scripts/deploy.ts --network sepolia`
6. ✅ Update `.env.local` with contract addresses
7. ✅ Integrate with Next.js app

See `BLOCKCHAIN_DEPLOYMENT.md` for full deployment guide.
