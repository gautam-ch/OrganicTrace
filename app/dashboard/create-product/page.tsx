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
import { parseEventLogs } from "viem"
import { PRODUCT_TRACKER_ADDRESS, ProductTrackerABI } from "@/lib/contracts"

export default function CreateProductPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined)
  const [synced, setSynced] = useState(false)
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
      setError(err instanceof Error ? err.message : "Failed to create product")
    } finally {
      // Keep loading until receipt is mined to proceed with syncing
    }
  }

  // Once the transaction is mined, parse the ProductCreated event and sync to Supabase
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

        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          setError("Not authenticated")
          return
        }

        const { data, error: insertError } = await supabase
          .from("products")
          .insert([
            {
              farmer_id: user.id,
              current_owner_id: user.id,
              product_name: formData.product_name,
              product_sku: formData.product_sku,
              product_type: formData.product_type,
              description: formData.description,
              farming_practices: formData.farming_practices,
              harvest_date: formData.harvest_date || null,
              status: "created",
              // On-chain linkage
              product_id_onchain: Number(productId),
              last_tx_hash: receipt.transactionHash,
              current_owner_address: address || null,
              blockchain_hash: receipt.transactionHash,
            },
          ])
          .select()

        if (insertError) throw insertError

        setSynced(true)
        setLoading(false)
        if (data && data[0]) {
          router.push(`/product/${data[0].id}`)
        }
      } catch (e) {
        setLoading(false)
        setError(e instanceof Error ? e.message : "Failed to sync product to database")
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
