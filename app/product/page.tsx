"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import ConnectButton from "@/components/wallet/connect-button"

export default function ProductPage() {
  const [productId, setProductId] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!productId.trim()) {
      setError("Please enter a product ID")
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await fetch(`/api/product/${productId}`)
      if (response.ok) {
        const data = await response.json()
        // Navigate to product details
        window.location.href = `/product/${productId}`
      } else {
        setError("Product not found")
      }
    } catch (err) {
      setError("Failed to fetch product")
    } finally {
      setLoading(false)
    }
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
            <span className="font-semibold text-lg">OrganicTrace</span>
          </Link>
          <div className="flex items-center gap-3">
            <ConnectButton fixed={false} />
            <Link href="/login">
              <Button variant="outline" size="sm">
                Login
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold">Track Your Organic Products</h1>
          <p className="text-lg text-muted-foreground">
            Enter a product ID or scan a QR code to view its complete lifecycle and verify authenticity.
          </p>
        </div>
      </section>

      {/* Search Card */}
      <section className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <Card className="p-8 border border-border">
          <form onSubmit={handleSearch} className="space-y-6">
            <div>
              <label htmlFor="productId" className="block text-sm font-medium mb-2">
                Product ID
              </label>
              <Input
                id="productId"
                type="text"
                placeholder="Enter product ID (e.g., 12345)"
                value={productId}
                onChange={(e) => {
                  setProductId(e.target.value)
                  setError("")
                }}
                className="w-full"
              />
            </div>

            {error && <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">{error}</div>}

            <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/90" size="lg">
              {loading ? "Tracking..." : "Track Product"}
            </Button>
          </form>

          <div className="mt-8 pt-8 border-t border-border">
            <p className="text-sm text-muted-foreground text-center">
              Don't have a product ID? Try entering <code className="bg-muted px-2 py-1 rounded">1</code> for a demo
              product.
            </p>
          </div>
        </Card>
      </section>
    </main>
  )
}
