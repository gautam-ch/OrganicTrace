// @ts-nocheck
import { ethers } from "hardhat"

// Usage examples:
//   npm run hardhat:add-certifier:local             # Uses env vars
//   CERTIFIER_ADDRESS=0x123... npm run hardhat:add-certifier:local
//   (Hardhat v3+) npm run hardhat:add-certifier:local -- -- 0x123... [registryAddress]

async function main() {
  // Try to get from CLI args first (Hardhat v3), otherwise from env vars
  const certifierArg = process.argv[2] || process.env.CERTIFIER_ADDRESS
  let registryArg = process.argv[3] || process.env.REGISTRY_ADDRESS

  if (!certifierArg) {
    throw new Error(
      "Missing CERTIFIER_ADDRESS.\nUsage:\n" +
      "  CERTIFIER_ADDRESS=<address> npm run hardhat:add-certifier:local\n" +
      "  or (Hardhat v3+): npm run hardhat:add-certifier:local -- -- <address> [registry]"
    )
  }

  const REGISTRY_ADDRESS =
    registryArg ||
    process.env.NEXT_PUBLIC_CERT_REGISTRY_ADDRESS ||
    process.env.CERT_REGISTRY_ADDRESS ||
    "0x5FbDB2315678afecb367f032d93F642f64180aa3"

  const CERTIFIER_ADDRESS = certifierArg

  console.log("\n🔧 Adding certifier")
  console.log("Registry:", REGISTRY_ADDRESS)
  console.log("Certifier:", CERTIFIER_ADDRESS)

  const [admin] = await ethers.getSigners()
  console.log("Admin (tx sender):", admin.address)

  const registry = await ethers.getContractAt("CertificationRegistry", REGISTRY_ADDRESS)

  const adminOnChain = await registry.admin()
  if (adminOnChain.toLowerCase() !== admin.address.toLowerCase()) {
    console.warn("⚠️  Current signer is not the admin on-chain. Transaction may revert.")
  }

  const tx = await registry.connect(admin).addCertifier(CERTIFIER_ADDRESS)
  console.log("⛓️  Tx sent:", tx.hash)
  await tx.wait()
  console.log("✅ Certifier added")

  const isCert = await registry.certifiers(CERTIFIER_ADDRESS)
  console.log("isCertifier:", isCert)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
