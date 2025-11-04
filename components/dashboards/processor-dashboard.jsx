"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"

export default function ProcessorDashboard({ user, profile }) {
  const [receivedProducts, setReceivedProducts] = useState([])
  const [certifications, setCertifications] = useState([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch products received by this processor
        const { data: productsData } = await supabase.from("products").select("*").eq("current_owner_id", user.id)

        // Fetch processor's approved certification requests (same table used by farmers)
        const { data: certsData } = await supabase
          .from("certification_requests")
          .select("*")
          .eq("farmer_id", user.id)
          .eq("status", "approved")
          .order("updated_at", { ascending: false })

        setReceivedProducts(productsData || [])
        setCertifications(certsData || [])
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
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Processor Dashboard</h1>
            <p className="text-lg text-muted-foreground">Track and manage incoming products</p>
          </div>
        </div>
      </section>

      {/* Certifications Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Organic Certifications</h2>
          <Link href="/dashboard/request-certification">
            <Button className="bg-primary hover:bg-primary/90">+ Request Certification</Button>
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
                <h3 className="font-semibold mb-2">{cert.certification_body || "Organic Certification"}</h3>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="text-muted-foreground">Status:</span> Approved
                  </p>
                  {cert.expiry_date && (
                    <p>
                      <span className="text-muted-foreground">Valid Until:</span>{" "}
                      {new Date(cert.expiry_date).toLocaleDateString()}
                    </p>
                  )}
                  {(cert.updated_at || cert.created_at) && (
                    <p>
                      <span className="text-muted-foreground">Approved On:</span>{" "}
                      {new Date(cert.updated_at || cert.created_at).toLocaleDateString()}
                    </p>
                  )}
                  {cert.document_url && (
                    <p>
                      <a
                        className="text-primary underline"
                        href={cert.document_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View Document
                      </a>
                    </p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground mb-4">No certifications added yet</p>
            <Link href="/dashboard/request-certification">
              <Button variant="outline">Request Your First Certification</Button>
            </Link>
          </Card>
        )}
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
