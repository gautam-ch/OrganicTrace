import { createConfig, http } from "wagmi"
import { injected } from "wagmi/connectors"
import { localhost, sepolia } from "viem/chains"

// RPC for Sepolia. Check common env names. Client bundles only include
// NEXT_PUBLIC_* values, so prefer NEXT_PUBLIC_SEPOLIA_RPC_URL or
// NEXT_PUBLIC_ETHEREUM_RPC_URL, then fall back to server-only ETHEREUM_RPC_URL.
const SEPOLIA_RPC =
  process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL || process.env.ETHEREUM_RPC_URL

// Treat localhost as a development-only chain. In production (e.g. Vercel)
// we should not include the Localhost chain because it causes the client to
// attempt requests to 127.0.0.1 (which fails when the user's browser is not
// running a local node). This keeps localhost available during development
// but prevents accidental localhost calls in production deployments.
const isDev = (process.env.NODE_ENV || "development") !== "production"

export const supportedChains = SEPOLIA_RPC
  ? // If a Sepolia RPC is configured, prefer Sepolia (and include localhost only in dev)
    (isDev ? [sepolia, localhost] : [sepolia])
  : // No external RPC configured -> default to localhost for local development
    [localhost]

// Build transports only for the chains we're including
const transports = {}
if (isDev) {
  // Only add the localhost transport when running in development
  transports[localhost.id] = http("http://127.0.0.1:8545")
}
if (SEPOLIA_RPC) {
  transports[sepolia.id] = http(SEPOLIA_RPC)
}

export const config = createConfig({
  chains: supportedChains,
  connectors: [injected({ shimDisconnect: true })],
  transports,
  multiInjectedProviderDiscovery: true,
})

export default config
