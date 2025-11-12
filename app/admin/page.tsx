"use client"

import type { FormEvent } from "react"
import { useEffect, useMemo, useState } from "react"
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi"
import { getAddress, isAddress } from "viem"
import DashboardHeader from "@/components/layout/dashboard-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CertificationRegistryABI, CERT_REGISTRY_ADDRESS } from "@/lib/contracts"

export default function AdminPage() {
  const { address, isConnected } = useAccount()
  const registryAddress = (CERT_REGISTRY_ADDRESS as `0x${string}` | "") || ""
  const contractAddress = registryAddress && registryAddress.startsWith("0x") ? (registryAddress as `0x${string}`) : undefined

  const {
    data: adminAddressRaw,
    error: adminError,
    isPending: adminLoading,
  } = useReadContract({
    abi: CertificationRegistryABI as any,
    address: contractAddress,
    functionName: "admin",
    query: { enabled: !!contractAddress },
  })

  const adminAddress = useMemo(() => (typeof adminAddressRaw === "string" ? adminAddressRaw : undefined), [adminAddressRaw])
  const isAdmin = useMemo(() => {
    if (!address || !adminAddress) return false
    return address.toLowerCase() === adminAddress.toLowerCase()
  }, [address, adminAddress])

  const { writeContractAsync } = useWriteContract()
  const [candidate, setCandidate] = useState("")
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined)
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [lastSubmitted, setLastSubmitted] = useState<string | null>(null)

  const {
    isLoading: confirming,
    isSuccess: confirmed,
    error: receiptError,
  } = useWaitForTransactionReceipt({ hash: txHash, confirmations: 1 })

  useEffect(() => {
    if (confirmed && lastSubmitted) {
      setSuccessMessage(`Certifier ${lastSubmitted} added successfully.`)
      setCandidate("")
      setLastSubmitted(null)
    }
  }, [confirmed, lastSubmitted])

  useEffect(() => {
    if (!receiptError) return

    // Normalize possible error shapes without using `instanceof` (TS strict mode)
    let msg = "Transaction failed"

    if (typeof receiptError === "object" && receiptError !== null) {
      const anyErr = receiptError as any
      if ("shortMessage" in anyErr || "message" in anyErr) {
        msg = String(anyErr.shortMessage || anyErr.message || msg)
      } else {
        msg = String(anyErr)
      }
    } else {
      msg = String(receiptError)
    }

    setErrorMessage(msg)
  }, [receiptError])

  const handleSubmit = async (evt: FormEvent<HTMLFormElement>) => {
    evt.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)
    setTxHash(undefined)
    setLastSubmitted(null)

    if (!contractAddress) {
      setErrorMessage("Certification registry address is not configured.")
      return
    }
    if (!isConnected || !address) {
      setErrorMessage("Connect with the deployer wallet to continue.")
      return
    }

    const trimmed = candidate.trim()
    if (!isAddress(trimmed)) {
      setErrorMessage("Enter a valid wallet address (0x...)")
      return
    }

    const target = getAddress(trimmed)
    try {
      setSubmitting(true)
      const hash = await writeContractAsync({
        abi: CertificationRegistryABI as any,
        address: contractAddress,
        functionName: "addCertifier",
        args: [target],
      })
      setTxHash(hash)
      setLastSubmitted(target)
    } catch (err) {
      const msg =
        err && typeof err === "object" && "shortMessage" in err
          ? String((err as any).shortMessage || (err as any).message)
          : err instanceof Error
          ? err.message
          : String(err || "Unknown error")
      setErrorMessage(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const busy = submitting || confirming
  const buttonLabel = submitting ? "Awaiting signature..." : confirming ? "Confirming..." : "Grant Certifier Access"

  const resolvedAdminError = adminError
    ? (() => {
        if (typeof adminError === "object" && adminError !== null) {
          const anyErr = adminError as any
          if ("shortMessage" in anyErr || "message" in anyErr) {
            return String(anyErr.shortMessage || anyErr.message)
          }
          return String(anyErr)
        }
        return String(adminError)
      })()
    : null

  return (
    <main className="min-h-screen bg-linear-to-b from-background to-muted">
      <DashboardHeader />
      <div className="container mx-auto p-6 mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Admin Tools</CardTitle>
            <CardDescription>Only the contract deployer can grant certifier permissions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 py-0 pb-6">
            {!isConnected && <p>Please connect your wallet to continue.</p>}

            {isConnected && !contractAddress && (
              <p className="text-destructive">
                Contract address not configured. Set NEXT_PUBLIC_CERT_REGISTRY_ADDRESS in your environment.
              </p>
            )}

            {isConnected && contractAddress && adminLoading && <p>Checking deployer permissions…</p>}

            {isConnected && contractAddress && resolvedAdminError && !adminLoading && (
              <p className="text-destructive">Failed to read admin address: {resolvedAdminError}</p>
            )}

            {isConnected && contractAddress && !adminLoading && adminAddress && !isAdmin && (
              <div className="space-y-2">
                <p className="text-destructive">Access denied. Connect with the deployer wallet to manage certifiers.</p>
                <p className="text-sm text-muted-foreground">
                  Connected wallet: {address}
                  <br />
                  {/* Contract admin: {adminAddress} */}
                </p>
              </div>
            )}

            {isConnected && contractAddress && !adminLoading && isAdmin && (
              <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
                <div className="space-y-2">
                  <Label htmlFor="wallet">Certifier wallet address</Label>
                  <Input
                    id="wallet"
                    placeholder="0x..."
                    value={candidate}
                    onChange={(event) => setCandidate(event.target.value)}
                    spellCheck={false}
                    autoComplete="off"
                    disabled={busy}
                  />
                </div>
                {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
                {successMessage && <p className="text-sm text-emerald-600">{successMessage}</p>}
                {txHash && (
                  <p className="text-xs text-muted-foreground break-all">Transaction hash: {txHash}</p>
                )}
                <div className="flex items-center gap-3">
                  <Button type="submit" disabled={busy || candidate.trim().length === 0}>
                    {buttonLabel}
                  </Button>
                  {busy && <span className="text-sm text-muted-foreground">Stay on this page until confirmation completes.</span>}
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
