"use client"

import type React from "react"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import ConnectButton from "@/components/wallet/connect-button"
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from "wagmi"
import { readContract } from "wagmi/actions"
import { parseEventLogs } from "viem"
import { CERT_REGISTRY_ADDRESS, PRODUCT_TRACKER_ADDRESS, CertificationRegistryABI, ProductTrackerABI } from "@/lib/contracts"
import wagmiConfig from "@/lib/wagmi"

export default function CreateProductPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined)
  const [synced, setSynced] = useState(false)
  const [isCertified, setIsCertified] = useState<boolean | null>(null)
  const { address } = useAccount()
  const { writeContractAsync } = useWriteContract()
  const {
    data: receipt,
    isLoading: waitingReceipt,
    isSuccess: isMined,
    error: receiptError,
  } = useWaitForTransactionReceipt({ hash: txHash, confirmations: 1 })
  const [formData, setFormData] = useState({
    product_name: "",
    product_sku: "",
    product_type: "",
    description: "",
    farming_practices: "",
    harvest_date: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      if (!address) {
        throw new Error("Connect your wallet to create a product")
      }

      // Fail fast if contract addresses are not configured
      if (!PRODUCT_TRACKER_ADDRESS || !CERT_REGISTRY_ADDRESS) {
        throw new Error("Blockchain not configured: missing contract addresses. Check your .env and deployment step.")
      }

      // Guard: ensure the current wallet is certified on this chain
      try {
        const isCertified = await readContract(wagmiConfig, {
          address: CERT_REGISTRY_ADDRESS as `0x${string}`,
          abi: CertificationRegistryABI as any,
          functionName: "verify",
          args: [address as `0x${string}`],
        })

        if (!isCertified) {
          throw new Error(
            "Your wallet is not certified on this blockchain. If you're on a fresh local Hardhat node, re-run the seed scripts to add a certifier and grant certification, or ask a certifier on this network to approve you."
          )
        }
      } catch (checkErr) {
        // If the read itself fails (e.g., wrong address/ABI), surface a concise message
        if (checkErr instanceof Error && checkErr.message) {
          // Only override if we didn't already set a friendly message above
          if (!checkErr.message.startsWith("Your wallet is not certified")) {
            throw new Error("Unable to verify certification status. Ensure contracts are deployed on the selected network.")
          }
          throw checkErr
        }
      }

      // Compose details payload for on-chain storage (JSON string)
      const details = JSON.stringify({
        product_sku: formData.product_sku,
        product_type: formData.product_type,
        description: formData.description,
        farming_practices: formData.farming_practices,
        harvest_date: formData.harvest_date,
      })

      // Call ProductTracker.createProduct(name, parentId=0, details)
      const hash = await writeContractAsync({
        address: PRODUCT_TRACKER_ADDRESS as `0x${string}`,
        abi: ProductTrackerABI as any,
        functionName: "createProduct",
        args: [formData.product_name, BigInt(0), details],
      })

      setTxHash(hash)
    } catch (err) {
      // Normalize common viem/contract errors to concise, user-friendly messages
      const msg = err instanceof Error ? err.message : String(err)

      let friendly = "Failed to create product"

      if (/certified farmers/i.test(msg) || /not certified/i.test(msg)) {
        friendly =
          "You are not a certified farmer, request a certifier to approve you."
      } else if (/Internal JSON-RPC error|execution reverted/i.test(msg)) {
        friendly =
          "Transaction reverted. Check that your wallet is certified and the correct network is selected."
      } else if (/missing contract addresses|Blockchain not configured/i.test(msg)) {
        friendly = msg
      }

      setError(friendly)
    } finally {
      // Keep loading until receipt is mined to proceed with syncing
    }
  }

  // Proactively check on-chain certification to guide the user
  useEffect(() => {
    const run = async () => {
      if (!address || !CERT_REGISTRY_ADDRESS) {
        setIsCertified(null)
        return
      }
      try {
        const ok = await readContract(wagmiConfig, {
          address: CERT_REGISTRY_ADDRESS as `0x${string}`,
          abi: CertificationRegistryABI as any,
          functionName: "verify",
          args: [address as `0x${string}`],
        })
        setIsCertified(!!ok)
      } catch {
        setIsCertified(null)
      }
    }
    run()
  }, [address])

  // Once the transaction is mined, parse the ProductCreated event and sync to backend (wallet-first API)
  useEffect(() => {
    const syncIfReady = async () => {
      if (!isMined || !receipt || synced) return

      try {
        // Parse ProductCreated(productId, farmer, productName)
        const events = parseEventLogs({
          abi: ProductTrackerABI as any,
          logs: receipt.logs || [],
          eventName: "ProductCreated",
        }) as unknown as Array<{ args: { productId: bigint } }>

        const productId = events?.[0]?.args?.productId
        if (typeof productId !== "bigint") {
          throw new Error("Could not parse productId from transaction logs")
        }

        // Fetch verified certification id for this wallet from our API
        let certification_id: string | null = null
        try {
          const resp = await fetch("/api/certifications/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ walletAddress: address }),
          })
          const json = await resp.json()
          const certs = Array.isArray(json?.certifications) ? json.certifications : Array.isArray(json?.data?.certifications) ? json.data.certifications : []
          if (json?.success && certs.length > 0) {
            certs.sort((a: any, b: any) => {
              const aTime = a?.valid_until ? new Date(a.valid_until).getTime() : 0
              const bTime = b?.valid_until ? new Date(b.valid_until).getTime() : 0
              return bTime - aTime
            })
            certification_id = certs[0]?.id || null
          }
        } catch (verifyErr) {
          console.error("[create-product] certification fetch failed", verifyErr)
        }

        if (!certification_id) {
          throw new Error("No verified certification found for this wallet in the database.")
        }

        // Call backend API to create the product (resolves profile by wallet)
        const resp = await fetch("/api/product", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress: address,
            product_name: formData.product_name,
            product_sku: formData.product_sku,
            product_type: formData.product_type,
            description: formData.description,
            farming_practices: formData.farming_practices,
            harvest_date: formData.harvest_date || null,
            certification_id,
            product_id_onchain: Number(productId),
            blockchain_hash: receipt.transactionHash,
            last_tx_hash: receipt.transactionHash,
          }),
        })

        const result = await resp.json()
        if (!resp.ok || !result?.success) {
          throw new Error(result?.message || "Failed to create the product")
        }

        setSynced(true)
        setLoading(false)
        // Navigate to on-chain product page using productId
        router.push(`/product/${Number(productId)}`)
      } catch (e: any) {
        setLoading(false)
        // Extract helpful supabase/Postgres error messages
        const rawMsg = e?.message || e?.error?.message || e?.hint || null
        let friendly = rawMsg || "Failed to sync product to backend"
        if (/No verified certification/i.test(String(rawMsg))) {
          friendly = "No verified certification found in database. Ask a certifier to approve you, then try again."
        } else if (/Product SKU already exists/i.test(String(rawMsg))) {
          friendly = rawMsg
        }
        setError(friendly)
      }
    }

    syncIfReady()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMined, receipt, synced])

  return (
    <main className="min-h-screen bg-linear-to-b from-background to-muted">
      <nav className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold">OT</span>
            </div>
            <span className="font-semibold">OrganicTrace</span>
          </Link>
          <div className="flex items-center gap-3">
            <ConnectButton fixed={false} />
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                Back
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <section className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-20">
        <h1 className="text-3xl font-bold mb-6">Create New Product</h1>

        <Card className="p-8 border border-border">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="product_name">Product Name</Label>
                <Input
                  id="product_name"
                  name="product_name"
                  value={formData.product_name}
                  onChange={handleChange}
                  placeholder="e.g., Organic Tomatoes"
                  required
                />
              </div>
              <div>
                <Label htmlFor="product_sku">Product SKU</Label>
                <Input
                  id="product_sku"
                  name="product_sku"
                  value={formData.product_sku}
                  onChange={handleChange}
                  placeholder="e.g., SKU-001"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="product_type">Product Type</Label>
              <Input
                id="product_type"
                name="product_type"
                value={formData.product_type}
                onChange={handleChange}
                placeholder="e.g., Vegetables, Fruits, Grains"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Product details and specifications"
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground min-h-20"
              />
            </div>

            <div>
              <Label htmlFor="farming_practices">Farming Practices</Label>
              <textarea
                id="farming_practices"
                name="farming_practices"
                value={formData.farming_practices}
                onChange={handleChange}
                placeholder="Describe your farming methods and practices"
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground min-h-20"
              />
            </div>

            <div>
              <Label htmlFor="harvest_date">Harvest Date</Label>
              <Input
                id="harvest_date"
                name="harvest_date"
                type="date"
                value={formData.harvest_date}
                onChange={handleChange}
              />
            </div>

            {error && <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">{error}</div>}

            <div className="flex gap-4 pt-6">
              <Button type="submit" disabled={loading || waitingReceipt} className="flex-1 bg-primary hover:bg-primary/90">
                {loading || waitingReceipt ? (txHash ? "Waiting for confirmation..." : "Creating...") : "Create Product"}
              </Button>
              <Link href="/dashboard" className="flex-1">
                <Button variant="outline" className="w-full bg-transparent">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </Card>
      </section>
    </main>
  )
}
