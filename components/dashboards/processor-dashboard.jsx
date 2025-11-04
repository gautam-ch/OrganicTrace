"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"

export default function ProcessorDashboard({ user, profile }) {
  const [receivedProducts, setReceivedProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch products received by this processor
        const { data: productsData } = await supabase.from("products").select("*").eq("current_owner_id", user.id)

        setReceivedProducts(productsData || [])
      } catch (err) {
        console.error("[v0] Error fetching processor data:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user.id, supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = "/"
  }

  return (
    <main className="min-h-screen bg-linear-to-b from-background to-muted">

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold mb-2">Processor Dashboard</h1>
        <p className="text-lg text-muted-foreground">Track and manage incoming products</p>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <h2 className="text-2xl font-bold mb-6">Received Products</h2>

        {loading ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Loading...</p>
          </Card>
        ) : receivedProducts.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-6">
            {receivedProducts.map((product) => (
              <Card key={product.id} className="p-6 border border-border hover:border-primary transition-colors">
                <h3 className="font-semibold text-lg mb-2">{product.product_name}</h3>
                <div className="space-y-2 text-sm mb-4">
                  <p>
                    <span className="text-muted-foreground">Type:</span> {product.product_type}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Status:</span> {product.status}
                  </p>
                </div>
                <Link href={`/product/${product.id}`}>
                  <Button variant="outline" size="sm" className="w-full bg-transparent">
                    View Details
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No products received yet</p>
          </Card>
        )}
      </section>

      <footer className="border-t border-border bg-muted/50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-muted-foreground text-sm">
          <p>OrganicTrace - Track Product Processing</p>
        </div>
      </footer>
    </main>
  )
}
