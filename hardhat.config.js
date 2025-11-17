// Ensure TypeScript tests/scripts run under CommonJS via a dedicated tsconfig
process.env.TS_NODE_PROJECT = process.env.TS_NODE_PROJECT || "tsconfig.hardhat.json"
try {
  require("ts-node/register/transpile-only")
  require("tsconfig-paths/register")
} catch (_) {
  // ts-node is optional at config-load time; Hardhat will still work for JS-only flows
}

require("@nomicfoundation/hardhat-toolbox")
require("@nomicfoundation/hardhat-verify")
// Load environment variables (prefer explicit .env, but allow process env overrides)
require("dotenv").config()
const fs = require("fs")

// Allow several env var names to be used so local .env.local or NEXT_PUBLIC_* values work
const SEPOLIA_RPC_URL =process.env.ETHEREUM_RPC_URL
// PRIVATE_KEY can be set directly or via a DEPLOYER_PRIVATE_KEY alias
const PRIVATE_KEY = process.env.PRIVATE_KEY
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY

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
    hardhat: {
      chainId: 31337,
    },
    sepolia: {
      url: SEPOLIA_RPC_URL || "",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 11155111,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY || "",
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
  },
}
