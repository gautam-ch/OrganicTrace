"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useAccount } from "wagmi"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function CertificationStatusPage() {
  const { address } = useAccount()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState([])

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        // Try to find profile by connected wallet, but also match on farmer_address
        const wallet = address || null
        let profileId = null
        if (wallet) {
          const { data: prof } = await supabase.from("profiles").select("id,wallet_address").ilike("wallet_address", wallet).maybeSingle()
          profileId = prof?.id || null
        }

        const q = supabase.from("certification_requests").select("*")
        if (profileId) q.or(`farmer_id.eq.${profileId},farmer_address.ilike.%${address}%`)
        else if (address) q.ilike("farmer_address", address)

        const { data, error } = await q.order("created_at", { ascending: false })
        if (error) {
          console.error("[cert-status] fetch error", error)
          setRequests([])
        } else {
          setRequests(data || [])
        }
      } catch (e) {
        console.error(e)
        setRequests([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [address, supabase])

  const pending = requests.filter((r) => r.status === "pending")
  const rejected = requests.filter((r) => r.status === "rejected")

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-xl  mt-6 flex items-start gap-2">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="flex items-center gap-1 text-lg">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Button>
        </Link>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Certification Requests Status</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : (
            <div className="space-y-6">
              <section>
                <h3 className="text-lg font-semibold mb-3">Pending Requests</h3>
                {pending.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No pending requests.</p>
                ) : (
                  <div className="border rounded-md overflow-hidden">
                    <div className="hidden md:grid grid-cols-4 gap-4 bg-muted/20 px-4 py-3 font-semibold">
                      <div>Applicant</div>
                      <div>Address</div>
                      <div>Submitted</div>
                      <div>Notes</div>
                    </div>
                    <div className="flex flex-col">
                      {pending.map((r) => (
                        <div key={r.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center border-b px-4 py-3">
                          <div className="truncate min-w-0">{r.name}</div>
                          <div className="font-mono text-xs truncate min-w-0">{r.farmer_address}</div>
                          <div className="whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</div>
                          <div className="max-w-[300px] truncate min-w-0">{r.notes || "—"}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-3">Rejected Requests</h3>
                {rejected.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No rejected requests.</p>
                ) : (
                  <div className="border rounded-md overflow-hidden">
                    <div className="hidden md:grid grid-cols-4 gap-4 bg-muted/20 px-4 py-3 font-semibold">
                      <div>Applicant</div>
                      <div>Address</div>
                      <div>Rejected On</div>
                      <div>Reason</div>
                    </div>
                    <div className="flex flex-col">
                      {rejected.map((r) => (
                        <div key={r.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center border-b px-4 py-3">
                          <div className="truncate min-w-0">{r.name}</div>
                          <div className="font-mono text-xs truncate min-w-0">{r.farmer_address}</div>
                          <div className="whitespace-nowrap">{new Date(r.updated_at || r.created_at).toLocaleString()}</div>
                          <div className="max-w-[300px] wrap-break-word min-w-0">{r.notes || "—"}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
