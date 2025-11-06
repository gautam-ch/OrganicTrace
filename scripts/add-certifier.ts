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
    process.env.CERT_REGISTRY_ADDRESS || '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707'

  const CERTIFIER_ADDRESS = certifierArg

  const network = await ethers.provider.getNetwork()
  console.log("\n🔧 Adding certifier")
  console.log("Network:", `${network.name} (chainId=${network.chainId})`)
  console.log("Registry:", REGISTRY_ADDRESS)
  console.log("Certifier:", CERTIFIER_ADDRESS)

  const [admin] = await ethers.getSigners()
  console.log("Admin (tx sender):", admin.address)

  // Sanity check: ensure there is contract code at the provided address
  const code = await ethers.provider.getCode(REGISTRY_ADDRESS)
  if (!code || code === "0x") {
    throw new Error(
      `No contract code found at ${REGISTRY_ADDRESS} on ${network.name} (chainId=${network.chainId}).\n` +
        `Make sure you've deployed CertificationRegistry to this network and are using the correct address.\n\n` +
        `Tip:\n` +
        `  1) Start a local node:   npm run hardhat:node\n` +
        `  2) Deploy locally:       npm run hardhat:deploy:local\n` +
        `  3) Use the printed CERT_REGISTRY_ADDRESS here (env or CLI arg).`
    )
  }

  const registry = await ethers.getContractAt("CertificationRegistry", REGISTRY_ADDRESS)

  let adminOnChain: string | undefined
  try {
    adminOnChain = await registry.admin()
  } catch (e) {
    console.warn("⚠️  Could not read admin() from CertificationRegistry. The ABI or address may be incorrect.")
    throw e
  }
  if (adminOnChain && adminOnChain.toLowerCase() !== admin.address.toLowerCase()) {
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
