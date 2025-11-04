"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"

export default function ConsumerDashboard({ user, profile }) {
  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = "/"
  }

  return (
    <main className="min-h-screen bg-linear-to-b from-background to-muted">
      

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold mb-2">Consumer Dashboard</h1>
        <p className="text-lg text-muted-foreground">Verify and track organic products you purchase</p>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-8 border border-border hover:border-primary transition-colors cursor-pointer">
            <h3 className="text-xl font-semibold mb-3">Scan QR Code</h3>
            <p className="text-muted-foreground mb-4">
              Use your device camera to scan a product QR code and verify authenticity
            </p>
            <Link href="/product">
              <Button className="w-full bg-primary hover:bg-primary/90">Scan Now</Button>
            </Link>
          </Card>

          <Card className="p-8 border border-border hover:border-primary transition-colors cursor-pointer">
            <h3 className="text-xl font-semibold mb-3">Search Products</h3>
            <p className="text-muted-foreground mb-4">
              Enter a product ID to view its complete lifecycle and certifications
            </p>
            <Link href="/product">
              <Button variant="outline" className="w-full bg-transparent">
                Search Product
              </Button>
            </Link>
          </Card>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <h2 className="text-2xl font-bold mb-6">Why Verify Products?</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="p-6 border border-border">
            <div className="text-3xl mb-3">🔍</div>
            <h3 className="font-semibold mb-2">Verify Authenticity</h3>
            <p className="text-sm text-muted-foreground">Confirm products are genuinely organic certified</p>
          </Card>
          <Card className="p-6 border border-border">
            <div className="text-3xl mb-3">🌾</div>
            <h3 className="font-semibold mb-2">View Origin</h3>
            <p className="text-sm text-muted-foreground">See where products were grown and who produced them</p>
          </Card>
          <Card className="p-6 border border-border">
            <div className="text-3xl mb-3">⛓️</div>
            <h3 className="font-semibold mb-2">Track Journey</h3>
            <p className="text-sm text-muted-foreground">Follow the complete path from farm to table</p>
          </Card>
        </div>
      </section>

      <footer className="border-t border-border bg-muted/50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-muted-foreground text-sm">
          <p>OrganicTrace - Build Trust Through Transparency</p>
        </div>
      </footer>
    </main>
  )
}
