"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import ConnectButton from "@/components/wallet/connect-button"

export default function CreateProductPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
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
            ...formData,
            status: "created",
          },
        ])
        .select()

      if (insertError) throw insertError

      if (data && data[0]) {
        router.push(`/product/${data[0].id}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create product")
    } finally {
      setLoading(false)
    }
  }

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
              <Button type="submit" disabled={loading} className="flex-1 bg-primary hover:bg-primary/90">
                {loading ? "Creating..." : "Create Product"}
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
