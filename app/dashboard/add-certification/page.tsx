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

export default function AddCertificationPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    certification_type: "",
    issuing_body: "",
    certification_number: "",
    valid_from: "",
    valid_until: "",
    certificate_url: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

      const { error: insertError } = await supabase.from("certifications").insert([
        {
          user_id: user.id,
          ...formData,
          verified: false,
        },
      ])

      if (insertError) throw insertError

      router.push("/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add certification")
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
        <h1 className="text-3xl font-bold mb-6">Add Organic Certification</h1>

        <Card className="p-8 border border-border">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="certification_type">Certification Type</Label>
              <Input
                id="certification_type"
                name="certification_type"
                value={formData.certification_type}
                onChange={handleChange}
                placeholder="e.g., USDA Organic, EU Organic"
                required
              />
            </div>

            <div>
              <Label htmlFor="issuing_body">Issuing Body</Label>
              <Input
                id="issuing_body"
                name="issuing_body"
                value={formData.issuing_body}
                onChange={handleChange}
                placeholder="e.g., USDA, Local Organic Board"
                required
              />
            </div>

            <div>
              <Label htmlFor="certification_number">Certification Number</Label>
              <Input
                id="certification_number"
                name="certification_number"
                value={formData.certification_number}
                onChange={handleChange}
                placeholder="Unique certification number"
                required
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="valid_from">Valid From</Label>
                <Input
                  id="valid_from"
                  name="valid_from"
                  type="date"
                  value={formData.valid_from}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="valid_until">Valid Until</Label>
                <Input
                  id="valid_until"
                  name="valid_until"
                  type="date"
                  value={formData.valid_until}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="certificate_url">Certificate URL</Label>
              <Input
                id="certificate_url"
                name="certificate_url"
                type="url"
                value={formData.certificate_url}
                onChange={handleChange}
                placeholder="Link to certificate document"
              />
            </div>

            {error && <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">{error}</div>}

            <div className="flex gap-4 pt-6">
              <Button type="submit" disabled={loading} className="flex-1 bg-primary hover:bg-primary/90">
                {loading ? "Adding..." : "Add Certification"}
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
