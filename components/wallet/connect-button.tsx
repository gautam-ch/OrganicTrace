"use client"

import { useMemo } from "react"
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from "wagmi"
import { Button } from "@/components/ui/button"

function short(addr: string) {
  return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : ""
}

export default function ConnectButton({ fixed = true }: { fixed?: boolean }) {
  const { address, isConnected, isConnecting } = useAccount()
  const chainId = useChainId()
  const { connect, connectors, status, error } = useConnect()
  const { disconnect } = useDisconnect()
  const { chains, switchChain, isPending: isSwitching } = useSwitchChain()

  const injected = useMemo(() => connectors.find((c) => c.id === "injected"), [connectors])

  const containerClass = fixed
    ? "fixed bottom-4 right-4 z-50 flex items-center gap-2"
    : "flex items-center gap-2"

  if (!injected) return null

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

      {error && !isConnected && (
        <span className="text-xs text-destructive bg-destructive/10 px-2 py-1 rounded">{error.message}</span>
      )}
    </div>
  )
}
