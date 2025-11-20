import { ethers } from "ethers"

// ABI for CertificationRegistry contract
const CERT_REGISTRY_ABI = [
  "function verify(address _farmer) public view returns (bool)",
  "function getCertification(address _farmer) public view returns (bool certified, uint256 expiryDate, string memory body, uint256 grantedAt)",
  // Event used to discover the certifier address and transaction hash
  "event CertificationGranted(address indexed farmer, address indexed certifier, uint256 expiryDate)",
]

// ABI for ProductTracker contract
const PRODUCT_TRACKER_ABI = [
  "function getProduct(uint256 _productId) public view returns (uint256 productId, address farmer, address currentOwner, string memory productName, uint256 parentProductId, uint256 createdAt, tuple(address actor, string action, uint256 timestamp, string details, string ipfsImageHash)[] memory history)",
  "function getHistoryLength(uint256 _productId) public view returns (uint256)",
  "function getHistoryEntry(uint256 _productId, uint256 _index) public view returns (address actor, string memory action, uint256 timestamp, string memory details, string memory ipfsImageHash)",
]

// Prefer server envs; fall back to NEXT_PUBLIC_* so local dev works even if server vars are missing
const RPC_URL =
  process.env.ETHEREUM_RPC_URL ||
  process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL ||
  // Default to local node to make local dev Just Work
  "http://127.0.0.1:8545"

// In dev, prefer NEXT_PUBLIC_* (used by the client) to avoid stale server-only envs during rapid redeploys
const devPreferPublic = (process.env.NODE_ENV || "development") !== "production"

const CERT_REGISTRY_ADDRESS = devPreferPublic
  ? process.env.NEXT_PUBLIC_CERT_REGISTRY_ADDRESS || process.env.CERT_REGISTRY_ADDRESS || ""
  : process.env.CERT_REGISTRY_ADDRESS || process.env.NEXT_PUBLIC_CERT_REGISTRY_ADDRESS || ""

const PRODUCT_TRACKER_ADDRESS = devPreferPublic
  ? process.env.NEXT_PUBLIC_PRODUCT_TRACKER_ADDRESS || process.env.PRODUCT_TRACKER_ADDRESS || ""
  : process.env.PRODUCT_TRACKER_ADDRESS || process.env.NEXT_PUBLIC_PRODUCT_TRACKER_ADDRESS || ""

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
 * Find the most recent CertificationGranted event for a farmer to extract the
 * certifier address and tx hash. Falls back to nulls if none are found.
 */
export async function getCertificationGrantProof(farmerAddress: string, grantedAtTimestamp?: string | number) {
  try {
    const iface = new ethers.Interface(CERT_REGISTRY_ABI)
    const topic0 = ethers.id("CertificationGranted(address,address,uint256)")
    const farmerTopic = ethers.zeroPadValue(ethers.getAddress(farmerAddress), 32)

    let fromBlock = 0
    let toBlock: string | number = "latest"

    // Optimization: If we know the timestamp, estimate the block number to avoid scanning full history
    if (grantedAtTimestamp) {
      try {
        const targetTime = Number(grantedAtTimestamp)
        const blockNumber = await findBlockByTimestamp(targetTime)
        
        // Search a very small window around the found block to satisfy strict RPC limits (10 blocks)
        // We search [blockNumber - 4, blockNumber + 4] which is 9 blocks.
        fromBlock = Math.max(0, blockNumber - 4)
        toBlock = blockNumber + 4
      } catch (e) {
        console.warn("Failed to find block by timestamp, falling back to full scan", e)
      }
    }

    const logs = await provider.getLogs({
      address: CERT_REGISTRY_ADDRESS,
      fromBlock,
      toBlock,
      topics: [topic0, farmerTopic],
    })

    if (!logs || logs.length === 0) return null
    const last = logs[logs.length - 1]
    const parsed = iface.decodeEventLog(
      "CertificationGranted",
      last.data,
      last.topics,
    ) as unknown as { farmer: string; certifier: string; expiryDate: bigint }

    return {
      certifier: parsed.certifier,
      txHash: last.transactionHash,
      blockNumber: last.blockNumber,
    }
  } catch (error) {
    console.error("Error getting certification grant event:", error)
    return null
  }
}

/**
 * Get product details and history
 */
export async function getProductDetails(productId: number) {
  try {
    const contract = getProductTracker()
    const [productIdBN, farmer, currentOwner, productName, parentProductId, createdAt, history] = await contract.getProduct(productId)

    return {
      productId: productIdBN.toString(),
      farmer,
      currentOwner,
      productName,
      parentProductId: parentProductId.toString(),
      createdAt: createdAt.toString(),
      history: history.map((entry: any) => ({
        actor: entry.actor,
        action: entry.action,
        timestamp: entry.timestamp.toString(),
        details: entry.details,
        ipfsImageHash: entry.ipfsImageHash,
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

async function findBlockByTimestamp(targetTimestamp: number): Promise<number> {
  let min = 0
  let max = await provider.getBlockNumber()
  
  while (min <= max) {
    const mid = Math.floor((min + max) / 2)
    const block = await provider.getBlock(mid)
    if (!block) {
      min = mid + 1
      continue
    }

    if (block.timestamp === targetTimestamp) return mid
    
    if (block.timestamp < targetTimestamp) {
      min = mid + 1
    } else {
      max = mid - 1
    }
  }
  return min
}
