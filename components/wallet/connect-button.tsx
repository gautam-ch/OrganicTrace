"use client"

import { useEffect, useMemo, useRef } from "react"
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain, useReadContract } from "wagmi"
import { useRouter, usePathname } from "next/navigation"
import { CertificationRegistryABI, CERT_REGISTRY_ADDRESS } from "@/lib/contracts.js"
import { Button } from "@/components/ui/button"
import CreateProfileModal from "@/components/auth/create-profile-modal"
import { useProfile } from "@/components/auth/profile-context"
import { cn } from "@/lib/utils"

function short(addr: string) {
  return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : ""
}

const CERTIFIER_REDIRECT_KEY = "certifierRedirected"

type ConnectButtonProps = {
  fixed?: boolean
  className?: string
  fullWidthOnMobile?: boolean
}

export default function ConnectButton({ fixed = true, className = "", fullWidthOnMobile = false }: ConnectButtonProps) {
  const { address, isConnected, isConnecting } = useAccount()
  const router = useRouter()
  const pathname = usePathname()
  const chainId = useChainId()
  const { connect, connectors, status, error } = useConnect()
  const { disconnect } = useDisconnect()
  const { chains, switchChain, isPending: isSwitching } = useSwitchChain()
  const lastPosted = useRef<string | null>(null)

  const injected = useMemo(() => connectors.find((c) => c.id === "injected"), [connectors])
  // If connected and this address is a certifier, auto-route to certifier dashboard
  const contractAddress = CERT_REGISTRY_ADDRESS ? (CERT_REGISTRY_ADDRESS as `0x${string}`) : undefined
  const { data: isCertifier } = useReadContract({
    abi: CertificationRegistryABI,
    address: contractAddress,
    functionName: "certifiers",
    args: address ? [address as `0x${string}`] : undefined,
    query: { enabled: !!address && !!contractAddress },
  })
  const isCertifierBool = typeof isCertifier === "boolean" ? isCertifier : false

  const hasRedirected = useRef(false)
  const lastRedirectedAddress = useRef<string | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    const stored = window.sessionStorage.getItem(CERTIFIER_REDIRECT_KEY)
    if (stored) {
      hasRedirected.current = true
      lastRedirectedAddress.current = stored
    }
  }, [])

  useEffect(() => {
    if (!isConnected || !address) {
      hasRedirected.current = false
      lastRedirectedAddress.current = null
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(CERTIFIER_REDIRECT_KEY)
      }
      return
    }

    if (lastRedirectedAddress.current && lastRedirectedAddress.current !== address) {
      hasRedirected.current = false
    }

    if (!isCertifierBool) return
    if (hasRedirected.current) return
    if (pathname === "/certifier-dashboard") {
      hasRedirected.current = true
      lastRedirectedAddress.current = address
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(CERTIFIER_REDIRECT_KEY, address)
      }
      return
    }

    hasRedirected.current = true
    lastRedirectedAddress.current = address
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(CERTIFIER_REDIRECT_KEY, address)
    }
    router.push("/certifier-dashboard")
  }, [isConnected, address, isCertifierBool, pathname, router])

  // When a user is logged in and connects a wallet, persist the address to their profile.
  useEffect(() => {
    const save = async () => {
      try {
        if (!isConnected || !address) return
        // Avoid spamming duplicate posts for same address
        if (lastPosted.current === address) return
        const res = await fetch("/api/me/wallet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address }),
        })
        // If user not logged in (401), just ignore silently
        if (res.ok) {
          lastPosted.current = address
        }
      } catch {
        // Non-blocking best-effort; ignore
      }
    }
    save()
  }, [isConnected, address])

  const responsiveStackClass = fullWidthOnMobile
    ? "flex w-full flex-col gap-3 sm:flex-row sm:items-center"
    : "flex items-center gap-2"

  const containerClass = cn(
    fixed
      ? "fixed bottom-4 right-4 z-50 flex flex-col gap-3 sm:flex-row sm:items-center"
      : "flex flex-col gap-3 sm:flex-row sm:items-center",
    !fixed && fullWidthOnMobile && "w-full",
    className
  )

  if (!injected) return null

  // Hide noisy errors that are expected UX (dismissed request, pending request)
  const displayError = useMemo(() => {
    if (!error) return null
    const msg = String(error.message || "")
    if (/user rejected/i.test(msg)) return null
    if (/request already pending|request pending/i.test(msg)) return null
    return error
  }, [error])

  const { needsSignup } = useProfile()

  const primaryButtonClass = fullWidthOnMobile ? "w-full sm:w-auto justify-center" : undefined

  return (
    <div className={containerClass}>
      <div className={responsiveStackClass}>
        {!isConnected ? (
          <Button
            size="sm"
            className={primaryButtonClass}
            onClick={() => connect({ connector: injected })}
            disabled={isConnecting || status === "pending"}
          >
            {isConnecting || status === "pending" ? "Connecting..." : "Connect Wallet"}
          </Button>
        ) : (
          <div className={cn("flex items-center gap-2", fullWidthOnMobile && "w-full justify-between sm:justify-start")}>
            <span className="text-sm text-muted-foreground hidden md:inline">{short(address!)}</span>
            <Button variant="outline" size="sm" className={primaryButtonClass} onClick={() => disconnect()}>
              Disconnect
            </Button>
          </div>
        )}

        {isConnected && chains.length > 0 && (
          <select
            className={cn(
              "text-sm bg-background border border-input rounded px-2 py-1",
              fullWidthOnMobile && "w-full sm:w-auto"
            )}
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
      </div>

      {displayError && !isConnected && (
        <span className="text-xs text-destructive bg-destructive/10 px-2 py-1 rounded">{displayError.message}</span>
      )}
      {isConnected && needsSignup && <CreateProfileModal />}
    </div>
  )
}
