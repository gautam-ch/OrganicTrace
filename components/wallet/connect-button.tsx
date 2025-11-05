"use client"

import { useEffect, useMemo } from "react"
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain, useReadContract } from "wagmi"
import { useRouter, usePathname } from "next/navigation"
import { CertificationRegistryABI, CERT_REGISTRY_ADDRESS } from "@/lib/contracts.js"
import { Button } from "@/components/ui/button"

function short(addr: string) {
  return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : ""
}

export default function ConnectButton({ fixed = true }: { fixed?: boolean }) {
  const { address, isConnected, isConnecting } = useAccount()
  const router = useRouter()
  const pathname = usePathname()
  const chainId = useChainId()
  const { connect, connectors, status, error } = useConnect()
  const { disconnect } = useDisconnect()
  const { chains, switchChain, isPending: isSwitching } = useSwitchChain()

  const injected = useMemo(() => connectors.find((c) => c.id === "injected"), [connectors])
  // If connected and this address is a certifier, auto-route to certifier dashboard
  const { data: isCertifier } = useReadContract({
    abi: CertificationRegistryABI,
    address: CERT_REGISTRY_ADDRESS as `0x${string}` | undefined,
    functionName: "certifiers",
    args: address ? [address as `0x${string}`] : undefined,
    query: { enabled: !!address && !!CERT_REGISTRY_ADDRESS },
  })

  useEffect(() => {
    if (!isConnected || !address) return
    if (!isCertifier) return
    if (pathname !== "/certifier-dashboard") {
      router.push("/certifier-dashboard")
    }
  }, [isConnected, address, isCertifier, pathname, router])


  const containerClass = fixed
    ? "fixed bottom-4 right-4 z-50 flex items-center gap-2"
    : "flex items-center gap-2"

  if (!injected) return null

  // Hide noisy errors that are expected UX (dismissed request, pending request)
  const displayError = useMemo(() => {
    if (!error) return null
    const msg = String(error.message || "")
    if (/user rejected/i.test(msg)) return null
    if (/request already pending|request pending/i.test(msg)) return null
    return error
  }, [error])

  return (
    <div className={containerClass}>
      {!isConnected ? (
        <Button size="sm" onClick={() => connect({ connector: injected })} disabled={isConnecting || status === "pending"}>
          {isConnecting || status === "pending" ? "Connecting..." : "Connect Wallet"}
        </Button>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground hidden md:inline">{short(address!)}</span>
          <Button variant="outline" size="sm" onClick={() => disconnect()}>
            Disconnect
          </Button>
        </div>
      )}

      {isConnected && chains.length > 0 && (
        <select
          className="text-sm bg-background border border-input rounded px-2 py-1"
          value={chainId}
          onChange={(e) => switchChain({ chainId: Number(e.target.value) })}
          disabled={isSwitching}
       >
          {chains.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      )}

      {displayError && !isConnected && (
        <span className="text-xs text-destructive bg-destructive/10 px-2 py-1 rounded">{displayError.message}</span>
      )}
    </div>
  )
}
