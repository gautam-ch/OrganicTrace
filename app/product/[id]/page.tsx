"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
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
  }
  history: Array<{
    action: string
    actor: string // formatted Address
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
                  <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                    ✓ Farmer Certified
                  </span>
                )}
                <span className="inline-flex items-center px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm font-medium">
                  On-Chain Product #{product.id}
                </span>
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
            {history.map((entry, index) => (
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
                    <p className="text-sm text-muted-foreground mb-2">Actor: {entry.actor}</p>
                    {entry.details && <p className="text-sm bg-muted/50 p-3 rounded">{entry.details}</p>}
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
