"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import ConnectButton from "@/components/wallet/connect-button"

interface ChainProductResponse {
  product: {
    id: string
    name: string
    farmer: string // formatted (0x1234...5678)
    farmerFull: string
    currentOwner: string // formatted
    createdAt: string // formatted date
    isFarmerCertified: boolean
    certification?: {
      certifier: string // formatted
      certifierFull: string
      verifiedAt: string // formatted date
      txHash: string
      documentUrl?: string | null
    } | null
  }
  history: Array<{
    action: string
    Owner: string // formatted Address
    timestamp: string // formatted date
    details: string
  }>
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [data, setData] = useState<ChainProductResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(`/api/product/${id}`)
        if (!response.ok) throw new Error("Product not found on chain")
        const json = await response.json()
        setData(json)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch product")
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [id])

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading product details...</p>
        </div>
      </main>
    )
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-background">
        <nav className="border-b border-border bg-background/80 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold">OT</span>
              </div>
              <span className="font-semibold">OrganicTrace</span>
            </Link>
            <div className="flex items-center gap-3">
              <ConnectButton fixed={false} />
            </div>
          </div>
        </nav>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h1 className="text-3xl font-bold mb-4">Product Not Found</h1>
          <p className="text-muted-foreground mb-8">{error}</p>
          <Link href="/product">
            <Button className="bg-primary hover:bg-primary/90">Back to Search</Button>
          </Link>
        </div>
      </main>
    )
  }

  const { product, history } = data
  const isCertified = product.isFarmerCertified
  const explorerBase = process.env.NEXT_PUBLIC_BLOCK_EXPLORER_BASE || "https://sepolia.etherscan.io"

  // --- UI helpers to render friendlier event details instead of raw JSON ---
  const tryParseJSON = (value: string): unknown | null => {
    try {
      // quick exit for obviously non-JSON strings
      if (!value || (value[0] !== "{" && value[0] !== "[")) return null
      return JSON.parse(value)
    } catch {
      return null
    }
  }

  const toTitle = (key: string): string => {
    // handle snake_case or camelCase -> Title Case
    const spaced = key
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/[_-]+/g, " ")
      .trim()
    return spaced.charAt(0).toUpperCase() + spaced.slice(1)
  }

  const renderDetails = (details: string) => {
    const parsed = tryParseJSON(details)
    if (parsed && typeof parsed === "object") {
      const entries = Object.entries(parsed as Record<string, unknown>)
      if (entries.length === 0) return null
      return (
        <div className="rounded-md border border-border bg-muted/40">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
            {entries.map(([k, v]) => {
              const value = Array.isArray(v)
                ? v.join(", ")
                : typeof v === "object" && v !== null
                ? JSON.stringify(v)
                : String(v)
              return (
                <div key={k} className="p-3 border-t first:border-t-0 sm:first:border-t sm:border-l-0 border-border">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{toTitle(k)}</p>
                  <p className="text-sm font-medium wrap-break-word">{value}</p>
                </div>
              )
            })}
          </div>
        </div>
      )
    }
    // Fallback to plain text if not JSON
  return <p className="text-sm bg-muted/50 p-3 rounded wrap-break-word">{details}</p>
  }

  return (
    <main className="min-h-screen bg-linear-to-b from-background to-muted">
      {/* Navigation */}
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
            <Link href="/product">
              <Button variant="outline" size="sm">
                Back to Search
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Product Header */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className="p-8 border border-border">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
              <div className="flex gap-3 flex-wrap">
                {isCertified && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <button className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium hover:bg-green-200 transition-colors">
                        ✓ Farmer Certified
                      </button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Certification Verified</DialogTitle>
                        <DialogDescription>
                          This farmer has an active on-chain organic certification.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="mt-2 space-y-3">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Verified by</p>
                          <p className="font-medium">{product.certification?.certifier || "Unknown"}</p>
                          {product.certification?.certifierFull && (
                            <p className="text-xs text-muted-foreground">{product.certification.certifierFull}</p>
                          )}
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Verified on</p>
                          <p className="font-medium">{product.certification?.verifiedAt ?? "—"}</p>
                        </div>
                        {product.certification?.txHash && (
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Transaction</p>
                            <a
                              href={`${explorerBase}/tx/${product.certification.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary underline break-all"
                            >
                              {product.certification.txHash}
                            </a>
                          </div>
                        )}
                        {product.certification?.documentUrl && (
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Document</p>
                            <a
                              href={product.certification.documentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary underline break-all"
                            >
                              View certificate/document
                            </a>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
                <a
                  href={`${explorerBase}/address/${process.env.NEXT_PUBLIC_PRODUCT_TRACKER_ADDRESS}#readContract`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`View contract state on explorer. In Read Contract, call getProduct with ID ${product.id}.`}
                  className="inline-flex items-center px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  On-Chain Product #{product.id}
                </a>
              </div>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <p>Created: {product.createdAt}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t border-border">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Origin Farmer</p>
              <p className="font-semibold">{product.farmer}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Current Owner</p>
              <p className="font-semibold">{product.currentOwner}</p>
            </div>
          </div>
        </Card>
      </section>

      {/* Product Journey (On-Chain History) */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <h2 className="text-2xl font-bold mb-8">Product Journey</h2>

        {history && history.length > 0 ? (
          <div className="space-y-6">
            {history.map((entry: ChainProductResponse["history"][number], index) => (
              <Card key={`${entry.action}-${index}`} className="p-6 border border-border">
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-4 h-4 rounded-full bg-primary"></div>
                    {index < history.length - 1 && <div className="w-0.5 h-20 bg-border mt-2"></div>}
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-lg">{entry.action}</h3>
                      <time className="text-sm text-muted-foreground">{entry.timestamp}</time>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">Owner: {entry.Owner}</p>
                    {entry.details && renderDetails(entry.details)}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-6 border border-border text-center">
            <p className="text-muted-foreground">No on-chain history available yet</p>
          </Card>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-muted-foreground text-sm">
          <p>OrganicTrace - All data is verified and stored securely</p>
        </div>
      </footer>
    </main>
  )
}
