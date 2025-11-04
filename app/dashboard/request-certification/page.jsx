"use client"

import { useState, useEffect } from "react"
import { useAccount } from "wagmi"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function RequestCertificationPage() {
  const { address } = useAccount()

  const [name, setName] = useState("")
  const [farmerAddress, setFarmerAddress] = useState("")
  const [docUrl, setDocUrl] = useState("")
  const [notes, setNotes] = useState("")
  const [certBody, setCertBody] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState("")

  // Prefill connected address when available
  useEffect(() => {
    if (address) setFarmerAddress(address)
  }, [address])

  async function onSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setMessage("")
    try {
      const res = await fetch("/api/certifications/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          farmer_address: farmerAddress,
          document_url: docUrl,
          notes,
          certification_body: certBody,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to submit request")
      setMessage("Request submitted! Status: pending")
      setName("")
      setNotes("")
      setDocUrl("")
      // keep address
    } catch (err) {
      setMessage(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto max-w-2xl p-6">
      <Card>
        <CardHeader>
          <CardTitle>Request Certification</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm mb-1">Full Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required />
            </div>
            <div>
              <label className="block text-sm mb-1">Wallet Address</label>
              <Input
                value={farmerAddress}
                onChange={(e) => setFarmerAddress(e.target.value)}
                placeholder="0x..."
                required
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Certification Body (optional)</label>
              <Input value={certBody} onChange={(e) => setCertBody(e.target.value)} placeholder="e.g., USDA Organic" />
            </div>
            <div>
              <label className="block text-sm mb-1">Supporting Document URL (PDF)</label>
              <Input value={docUrl} onChange={(e) => setDocUrl(e.target.value)} placeholder="https://...pdf" />
            </div>
            <div>
              <label className="block text-sm mb-1">Notes</label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional info" />
            </div>
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Request"}
              </Button>
              {message && <span className="text-sm">{message}</span>}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
 
