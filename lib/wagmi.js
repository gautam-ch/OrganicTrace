import { createConfig, http } from "wagmi"
import { injected } from "wagmi/connectors"
import { localhost, sepolia } from "viem/chains"

// Dynamically include Sepolia only if an RPC URL is provided
const SEPOLIA_RPC = process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL || process.env.ETHEREUM_RPC_URL

export const supportedChains = SEPOLIA_RPC ? [localhost, sepolia] : [localhost]

export const config = createConfig({
  chains: supportedChains,
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [localhost.id]: http("http://127.0.0.1:8545"),
    ...(SEPOLIA_RPC ? { [sepolia.id]: http(SEPOLIA_RPC) } : {}),
  },
  multiInjectedProviderDiscovery: true,
})

export default config
