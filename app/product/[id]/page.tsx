"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { use } from "react"
import ConnectButton from "@/components/wallet/connect-button"

interface ProductData {
  id: string
  product_name: string
  product_sku: string
  product_type: string
  description: string
  farming_practices: string
  harvest_date: string
  status: string
  created_at: string
  current_owner_id: string
  farmer_id: string
  certifications: {
    certification_type: string
    certification_number: string
    valid_until: string
    verified: boolean
  } | null
  movements: Array<{
    id: string
    movement_type: string
    location: string
    notes: string
    timestamp: string
    from_user_id: string
    to_user_id: string
  }>
  farmer_name: string
  current_owner_name: string
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [product, setProduct] = useState<ProductData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(`/api/products/${id}`)
        if (!response.ok) throw new Error("Product not found")
        const data = await response.json()
        setProduct(data)
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

  if (error || !product) {
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

  const isCertified = product.certifications?.verified

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
              <h1 className="text-3xl font-bold mb-2">{product.product_name}</h1>
              <p className="text-muted-foreground mb-3">{product.product_type}</p>
              <div className="flex gap-3 flex-wrap">
                {isCertified && (
                  <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                    ✓ Certified Organic
                  </span>
                )}
                <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                  {product.status.charAt(0).toUpperCase() + product.status.slice(1)}
                </span>
              </div>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <p>SKU: {product.product_sku}</p>
              <p>Created: {new Date(product.created_at).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-6 border-t border-border">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Origin Farmer</p>
              <p className="font-semibold">{product.farmer_name}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Current Owner</p>
              <p className="font-semibold">{product.current_owner_name}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Harvest Date</p>
              <p className="font-semibold">
                {product.harvest_date ? new Date(product.harvest_date).toLocaleDateString() : "N/A"}
              </p>
            </div>
            {product.certifications && (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Certification</p>
                <p className="font-semibold">{product.certifications.certification_type}</p>
              </div>
            )}
          </div>

          {product.description && (
            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Description</p>
              <p className="text-foreground">{product.description}</p>
            </div>
          )}

          {product.farming_practices && (
            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Farming Practices</p>
              <p className="text-foreground">{product.farming_practices}</p>
            </div>
          )}
        </Card>
      </section>

      {/* Product Journey */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <h2 className="text-2xl font-bold mb-8">Product Journey</h2>

        {product.movements && product.movements.length > 0 ? (
          <div className="space-y-6">
            {product.movements.map((movement, index) => (
              <Card key={movement.id} className="p-6 border border-border">
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-4 h-4 rounded-full bg-primary"></div>
                    {index < product.movements!.length - 1 && <div className="w-0.5 h-20 bg-border mt-2"></div>}
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-lg">
                        {movement.movement_type === "transfer"
                          ? "Transferred"
                          : movement.movement_type === "processing"
                            ? "Processing"
                            : "Received"}
                      </h3>
                      <time className="text-sm text-muted-foreground">
                        {new Date(movement.timestamp).toLocaleString()}
                      </time>
                    </div>
                    {movement.location && (
                      <p className="text-sm text-muted-foreground mb-2">Location: {movement.location}</p>
                    )}
                    {movement.notes && <p className="text-sm bg-muted/50 p-3 rounded">{movement.notes}</p>}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-6 border border-border text-center">
            <p className="text-muted-foreground">No movement history available yet</p>
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
