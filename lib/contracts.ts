export const CERT_REGISTRY_ADDRESS: string = process.env.NEXT_PUBLIC_CERT_REGISTRY_ADDRESS || ""

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

