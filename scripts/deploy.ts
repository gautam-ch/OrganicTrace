import { ethers } from "hardhat"

async function main() {
  console.log("🚀 Deploying OrganicTrace Contracts...\n")

  // Get deployer account
  const [deployer] = await ethers.getSigners()
  const network = await ethers.provider.getNetwork()

  console.log(`📍 Network: ${network.name} (Chain ID: ${network.chainId})`)
  console.log(`👤 Deployer: ${deployer.address}\n`)

  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address)
  console.log(`💰 Account balance: ${ethers.formatEther(balance)} ETH\n`)

  // Deploy CertificationRegistry
  console.log("📋 Deploying CertificationRegistry...")
  const CertificationRegistry = await ethers.getContractFactory("CertificationRegistry")
  const certRegistry = await CertificationRegistry.deploy()
  await certRegistry.waitForDeployment()
  const certRegistryAddress = await certRegistry.getAddress()
  console.log(`✅ CertificationRegistry deployed to: ${certRegistryAddress}\n`)

  // Deploy ProductTracker
  console.log("📦 Deploying ProductTracker...")
  const ProductTracker = await ethers.getContractFactory("ProductTracker")
  const productTracker = await ProductTracker.deploy(certRegistryAddress)
  await productTracker.waitForDeployment()
  const productTrackerAddress = await productTracker.getAddress()
  console.log(`✅ ProductTracker deployed to: ${productTrackerAddress}\n`)

  // Save addresses
  console.log("📝 Contract Addresses:")
  console.log("═══════════════════════════════════════════")
  console.log(`CERT_REGISTRY_ADDRESS=${certRegistryAddress}`)
  console.log(`PRODUCT_TRACKER_ADDRESS=${productTrackerAddress}`)
  console.log("═══════════════════════════════════════════\n")

  console.log("💡 Add these to your .env.local file:")
  console.log(`NEXT_PUBLIC_CERT_REGISTRY_ADDRESS=${certRegistryAddress}`)
  console.log(`NEXT_PUBLIC_PRODUCT_TRACKER_ADDRESS=${productTrackerAddress}\n`)

  // Verify contracts if on Sepolia
  if (network.chainId === 11155111) {
    console.log("⏳ Waiting 30 seconds before verification...")
    await new Promise((resolve) => setTimeout(resolve, 30000))

    console.log("🔍 Verifying contracts on Etherscan...\n")

    try {
      console.log("Verifying CertificationRegistry...")
      await ethers.verify.verify({
        address: certRegistryAddress,
        constructorArguments: [],
      })
      console.log("✅ CertificationRegistry verified\n")
    } catch (error) {
      console.log("⚠️  CertificationRegistry verification skipped")
    }

    try {
      console.log("Verifying ProductTracker...")
      await ethers.verify.verify({
        address: productTrackerAddress,
        constructorArguments: [certRegistryAddress],
      })
      console.log("✅ ProductTracker verified\n")
    } catch (error) {
      console.log("⚠️  ProductTracker verification skipped")
    }
  }

  console.log("🎉 Deployment completed!")
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
