// Minimal ABIs and addresses for client-side wagmi usage

export const CERT_REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_CERT_REGISTRY_ADDRESS || "";

// viem/wagmi compatible ABI (subset we need)
export const CertificationRegistryABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "_farmer", "type": "address" },
      { "internalType": "uint256", "name": "_expiryDate", "type": "uint256" },
      { "internalType": "string", "name": "_certificationBody", "type": "string" }
    ],
    "name": "grantCertification",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "", "type": "address" }
    ],
    "name": "certifiers",
    "outputs": [
      { "internalType": "bool", "name": "", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [ { "internalType": "address", "name": "_farmer", "type": "address" } ],
    "name": "verify",
    "outputs": [ { "internalType": "bool", "name": "", "type": "bool" } ],
    "stateMutability": "view",
    "type": "function"
  }
];
