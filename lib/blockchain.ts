import { ethers } from "ethers"

// ABI for CertificationRegistry contract
const CERT_REGISTRY_ABI = [
  "function verify(address _farmer) public view returns (bool)",
  "function getCertification(address _farmer) public view returns (bool certified, uint256 expiryDate, string memory body, uint256 grantedAt)",
]

// ABI for ProductTracker contract
const PRODUCT_TRACKER_ABI = [
  "function getProduct(uint256 _productId) public view returns (uint256 productId, address farmer, address currentOwner, string memory productName, uint256 createdAt, tuple(address actor, string action, uint256 timestamp, string details)[] memory history)",
  "function getHistoryLength(uint256 _productId) public view returns (uint256)",
  "function getHistoryEntry(uint256 _productId, uint256 _index) public view returns (address actor, string memory action, uint256 timestamp, string memory details)",
]

const RPC_URL = process.env.ETHEREUM_RPC_URL || "https://sepolia.infura.io/v3/YOUR_INFURA_KEY"
const CERT_REGISTRY_ADDRESS = process.env.CERT_REGISTRY_ADDRESS || ""
const PRODUCT_TRACKER_ADDRESS = process.env.PRODUCT_TRACKER_ADDRESS || ""

// Create a provider
const provider = new ethers.JsonRpcProvider(RPC_URL)

/**
 * Create a read-only instance of the CertificationRegistry contract
 */
export function getCertificationRegistry() {
  return new ethers.Contract(CERT_REGISTRY_ADDRESS, CERT_REGISTRY_ABI, provider)
}

/**
 * Create a read-only instance of the ProductTracker contract
 */
export function getProductTracker() {
  return new ethers.Contract(PRODUCT_TRACKER_ADDRESS, PRODUCT_TRACKER_ABI, provider)
}

/**
 * Verify if a farmer is certified
 */
export async function verifyCertification(farmerAddress: string): Promise<boolean> {
  try {
    const contract = getCertificationRegistry()
    return await contract.verify(farmerAddress)
  } catch (error) {
    console.error("Error verifying certification:", error)
    return false
  }
}

/**
 * Get certification details
 */
export async function getCertificationDetails(farmerAddress: string) {
  try {
    const contract = getCertificationRegistry()
    const [certified, expiryDate, body, grantedAt] = await contract.getCertification(farmerAddress)
    return {
      certified,
      expiryDate: expiryDate.toString(),
      certificationBody: body,
      grantedAt: grantedAt.toString(),
    }
  } catch (error) {
    console.error("Error getting certification details:", error)
    return null
  }
}

/**
 * Get product details and history
 */
export async function getProductDetails(productId: number) {
  try {
    const contract = getProductTracker()
    const [productIdBN, farmer, currentOwner, productName, createdAt, history] = await contract.getProduct(productId)

    return {
      productId: productIdBN.toString(),
      farmer,
      currentOwner,
      productName,
      createdAt: createdAt.toString(),
      history: history.map((entry: any) => ({
        actor: entry.actor,
        action: entry.action,
        timestamp: entry.timestamp.toString(),
        details: entry.details,
      })),
    }
  } catch (error) {
    console.error("Error getting product details:", error)
    return null
  }
}

/**
 * Format address for display (0x1234...5678)
 */
export function formatAddress(address: string): string {
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
}

/**
 * Format timestamp to readable date
 */
export function formatDate(timestamp: string | number): string {
  const date = new Date(Number(timestamp) * 1000)
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}
