export const CERT_REGISTRY_ADDRESS: string = process.env.NEXT_PUBLIC_CERT_REGISTRY_ADDRESS || ""
export const PRODUCT_TRACKER_ADDRESS: string = process.env.NEXT_PUBLIC_PRODUCT_TRACKER_ADDRESS || ""

// Minimal ABI subset needed by the app
export const CertificationRegistryABI: any[] = [
	{
		inputs: [
			{ internalType: "address", name: "_farmer", type: "address" },
			{ internalType: "uint256", name: "_expiryDate", type: "uint256" },
			{ internalType: "string", name: "_certificationBody", type: "string" },
		],
		name: "grantCertification",
		outputs: [],
		stateMutability: "nonpayable",
		type: "function",
	},
	{
		inputs: [{ internalType: "address", name: "", type: "address" }],
		name: "certifiers",
		outputs: [{ internalType: "bool", name: "", type: "bool" }],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [{ internalType: "address", name: "_farmer", type: "address" }],
		name: "verify",
		outputs: [{ internalType: "bool", name: "", type: "bool" }],
		stateMutability: "view",
		type: "function",
	},
]

// Minimal ProductTracker ABI for client write/read flows
export const ProductTrackerABI: any[] = [
  {
    inputs: [
      { internalType: "string", name: "_productName", type: "string" },
      { internalType: "uint256", name: "_parentProductId", type: "uint256" },
      { internalType: "string", name: "_details", type: "string" },
    ],
    name: "createProduct",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "productId", type: "uint256" },
      { indexed: true, internalType: "address", name: "farmer", type: "address" },
      { indexed: false, internalType: "string", name: "productName", type: "string" },
    ],
    name: "ProductCreated",
    type: "event",
  },
]

