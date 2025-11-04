"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"

export default function FarmerDashboard({ user, profile }) {
  const [products, setProducts] = useState([])
  const [certifications, setCertifications] = useState([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch farmer's products
        const { data: productsData } = await supabase.from("products").select("*").eq("farmer_id", user.id)

        // Fetch farmer's certifications
        const { data: certsData } = await supabase.from("certifications").select("*").eq("user_id", user.id)

        setProducts(productsData || [])
        setCertifications(certsData || [])
      } catch (err) {
        console.error("[v0] Error fetching farmer data:", err)
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

      {/* Dashboard Header */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Farmer Dashboard</h1>
          <p className="text-lg text-muted-foreground">Manage your products and certifications</p>
        </div>
      </section>

      {/* User Info */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <Card className="p-8 border border-border">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Email</p>
              <p className="font-medium">{user.email}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Organization</p>
              <p className="font-medium">{profile.organization_name || "N/A"}</p>
            </div>
          </div>
        </Card>
      </section>

      {/* Certifications Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Organic Certifications</h2>
          <Link href="/dashboard/add-certification">
            <Button className="bg-primary hover:bg-primary/90">+ Add Certification</Button>
          </Link>
        </div>

        {loading ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Loading...</p>
          </Card>
        ) : certifications.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-6">
            {certifications.map((cert) => (
              <Card key={cert.id} className="p-6 border border-border">
                <h3 className="font-semibold mb-2">{cert.certification_type}</h3>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="text-muted-foreground">Cert #:</span> {cert.certification_number}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Issuer:</span> {cert.issuing_body}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Valid Until:</span>{" "}
                    {new Date(cert.valid_until).toLocaleDateString()}
                  </p>
                  {cert.verified && <p className="text-green-600 font-medium">✓ Verified</p>}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground mb-4">No certifications added yet</p>
            <Link href="/dashboard/add-certification">
              <Button variant="outline">Add Your First Certification</Button>
            </Link>
          </Card>
        )}
      </section>

      {/* Products Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Your Products</h2>
          <Link href="/dashboard/create-product">
            <Button className="bg-primary hover:bg-primary/90">+ Create Product</Button>
          </Link>
        </div>

        {products.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-6">
            {products.map((product) => (
              <Card key={product.id} className="p-6 border border-border hover:border-primary transition-colors">
                <h3 className="font-semibold text-lg mb-2">{product.product_name}</h3>
                <p className="text-sm text-muted-foreground mb-3">{product.product_type}</p>
                <div className="space-y-2 text-sm mb-4">
                  <p>
                    <span className="text-muted-foreground">SKU:</span> {product.product_sku}
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
            <p className="text-muted-foreground mb-4">No products created yet</p>
            <Link href="/dashboard/create-product">
              <Button>Create Your First Product</Button>
            </Link>
          </Card>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-muted-foreground text-sm">
          <p>OrganicTrace - Empower Your Organic Products</p>
        </div>
      </footer>
    </main>
  )
}
