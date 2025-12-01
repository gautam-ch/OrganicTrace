"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi"
import wagmiConfig from "@/lib/wagmi"
import { isAddress } from "viem"
import { PRODUCT_TRACKER_ADDRESS, ProductTrackerABI } from "@/lib/contracts"
import MediaUploader from "@/components/media/media-uploader"

export default function FarmerDashboard({ user, profile }) {
  const [products, setProducts] = useState([])
  const [certifications, setCertifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState(null) // product selected for transfer
  const [toAddress, setToAddress] = useState("")
  const [action, setAction] = useState("Transferred to Processor")
  const [location, setLocation] = useState("")
  const [notes, setNotes] = useState("")
  const [error, setError] = useState("")
  const [txHash, setTxHash] = useState(undefined)
  const [eventModal, setEventModal] = useState(null)
  const [eventAction, setEventAction] = useState("Field Inspection")
  const [eventNotes, setEventNotes] = useState("")
  const [eventLocation, setEventLocation] = useState("")
  const [eventMedia, setEventMedia] = useState([])
  const [eventError, setEventError] = useState("")
  const [eventSuccess, setEventSuccess] = useState("")
  const [eventTxHash, setEventTxHash] = useState(undefined)
  const supabase = createClient()
  const { address } = useAccount()
  const { writeContractAsync } = useWriteContract()
  const { data: receipt, isLoading: waitingReceipt, isSuccess: isMined } = useWaitForTransactionReceipt({ hash: txHash, confirmations: 1 })
  const { data: eventReceipt, isLoading: waitingEventReceipt, isSuccess: eventMined } = useWaitForTransactionReceipt({ hash: eventTxHash, confirmations: 1 })

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch products created by this farmer profile
        const { data: productsData } = await supabase.from("products").select("*").eq("farmer_id", user.id)

        // Fetch verified certifications from certifications table (wallet-first model)
        const { data: certsData, error: certErr } = await supabase
          .from("certifications")
          .select("id, certificate_url, verified, valid_from, valid_until, created_at, updated_at")
          .eq("user_id", user.id)
          .eq("verified", true)
          .order("valid_until", { ascending: false })

        if (certErr) {
          console.error("[farmer-dashboard] certifications fetch error", certErr)
        }

        setProducts(productsData || [])
        setCertifications((certsData || []).map(c => ({
          id: c.id,
          certification_body: "Organic Certification", // placeholder label
          document_url: c.certificate_url || null,
          updated_at: c.updated_at,
          created_at: c.created_at,
          expiry_date: c.valid_until,
        })))
      } catch (err) {
        console.error("[farmer-dashboard] Error fetching farmer data:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user.id, supabase])
  // After a successful on-chain transfer, persist minimal metadata locally and refresh list
  useEffect(() => {
    const persist = async () => {
      if (!isMined || !receipt || !active) return
      try {
        // Try to map recipient wallet to an existing user profile
        let toUserId = null
        const normalizedAddress = toAddress.toLowerCase()
        const { data: prof } = await supabase.from("profiles").select("id").eq("wallet_address", normalizedAddress).maybeSingle()
        toUserId = prof?.id || null

        // Update our products table: owner id (if known), owner address always, status in_transit
        await supabase
          .from("products")
          .update({ current_owner_id: toUserId, current_owner_address: normalizedAddress, status: "in_transit" })
          .eq("id", active.id)

        // Optimistically update UI list
        setProducts((prev) => prev.map((p) => (p.id === active.id ? { ...p, current_owner_id: toUserId, current_owner_address: normalizedAddress, status: "in_transit" } : p)))
      } catch (e) {
        // Non-blocking
      } finally {
        setActive(null)
        setToAddress("")
        setAction("Transferred to Processor")
        setLocation("")
        setNotes("")
        setError("")
      }
    }
    persist()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMined, receipt])

  useEffect(() => {
    if (!eventMined || !eventTxHash) return
    setEventSuccess("Journey event recorded on-chain.")
    setEventTxHash(undefined)
  }, [eventMined, eventTxHash])

  const resetEventForm = () => {
    setEventAction("Field Inspection")
    setEventNotes("")
    setEventLocation("")
  setEventMedia([])
    setEventError("")
    setEventSuccess("")
    setEventTxHash(undefined)
  }

  const openEventModal = (product) => {
    setEventModal(product)
    setEventAction(product?.status?.toLowerCase().includes("harvest") ? "Harvested" : "Field Inspection")
    setEventNotes("")
    setEventLocation("")
  setEventMedia([])
    setEventError("")
    setEventSuccess("")
    setEventTxHash(undefined)
  }

  const canTransfer = useMemo(() => {
    if (!active) return false
    // Allow transfer if the current dashboard user is also the current owner in DB
    return active.current_owner_id === user.id
  }, [active, user.id])

  const submitTransfer = async () => {
    try {
      setError("")
      if (!active) return
      if (!PRODUCT_TRACKER_ADDRESS) throw new Error("Blockchain not configured: missing ProductTracker address")
      if (!isAddress(toAddress)) throw new Error("Enter a valid Ethereum address")
      if (!active.product_id_onchain) throw new Error("This product is not linked to an on-chain id")

      const details = JSON.stringify({ to: toAddress, movement_type: "to_processor", location: location || undefined, notes: notes || undefined })

      const hash = await writeContractAsync({
        address: PRODUCT_TRACKER_ADDRESS,
        abi: ProductTrackerABI,
        functionName: "transferProduct",
        args: [BigInt(active.product_id_onchain), toAddress, action, details],
      })
      setTxHash(hash)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      let friendly = "Failed to transfer product"
      if (/Only current owner/i.test(msg)) friendly = "You are not the current owner"
      else if (/invalid address/i.test(msg) || /valid Ethereum address/i.test(msg)) friendly = "Enter a valid Ethereum address"
      else if (/Blockchain not configured/i.test(msg)) friendly = msg
      else if (/not linked to an on-chain id/i.test(msg)) friendly = "This product is not linked to an on-chain id. Re-sync or recreate the product first."
      setError(friendly)
    }
  }

  const submitEvent = async () => {
    if (!eventModal) return
    try {
      setEventError("")
      setEventSuccess("")
      if (!PRODUCT_TRACKER_ADDRESS) throw new Error("Blockchain not configured: missing ProductTracker address")
      if (!eventModal.product_id_onchain) throw new Error("This product is not linked to an on-chain id")
      if (!eventAction.trim()) throw new Error("Provide an action title for this event")

      const detailPayload = {
        notes: eventNotes.trim() || undefined,
        location: eventLocation.trim() || undefined,
        dashboard: "farmer",
        media: eventMedia.length > 0 ? eventMedia.map((m) => m.cid) : undefined,
      }
      const cleaned = Object.entries(detailPayload).reduce((acc, [key, value]) => {
        if (value) acc[key] = value
        return acc
      }, {})
      const details = Object.keys(cleaned).length > 0 ? JSON.stringify(cleaned) : eventAction.trim()
  const ipfsPayload = eventMedia.length > 1 ? JSON.stringify(eventMedia.map((m) => m.cid)) : eventMedia[0]?.cid || ""

      const hash = await writeContractAsync({
        address: PRODUCT_TRACKER_ADDRESS,
        abi: ProductTrackerABI,
        functionName: "addHistoryEvent",
  args: [BigInt(eventModal.product_id_onchain), eventAction.trim(), details, ipfsPayload],
      })
      setEventTxHash(hash)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      let friendly = "Failed to log event"
      if (/Only current owner/i.test(msg)) friendly = "You are not the current on-chain owner"
      else if (/linked to an on-chain id/i.test(msg)) friendly = msg
      else if (/Provide an action/i.test(msg)) friendly = msg
      else if (/Blockchain not configured/i.test(msg)) friendly = msg
      setEventError(friendly)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = "/"
  }

  return (
    <main className="min-h-screen bg-linear-to-b from-background to-muted">

      {/* Dashboard Header */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-10 sm:py-12">
        <div className="space-y-2 text-center sm:text-left">
          <h1 className="text-3xl font-bold sm:text-4xl">Farmer Dashboard</h1>
          <p className="text-base sm:text-lg text-muted-foreground">Manage your products and certifications</p>
        </div>
      </section>

      {/* User Info */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <Card className="p-8 border border-border">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Name</p>
              <p className="font-medium">{profile?.full_name || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Number of Products</p>
              <p className="font-medium">{products?.length ?? 0}</p>
            </div>
          </div>
        </Card>
      </section>

      {/* Certifications Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
          <h2 className="text-2xl font-bold">Organic Certifications</h2>
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full lg:w-auto">
            <Link href="/dashboard/request-certification" className="w-full sm:w-auto">
              <Button className="w-full bg-primary hover:bg-primary/90">+ Request Certification</Button>
            </Link>
            <Link href="/dashboard/certification-status" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full">Check Status</Button>
            </Link>
          </div>
        </div>

        {loading ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Loading...</p>
          </Card>
        ) : certifications.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
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

      {/* Products Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
          <h2 className="text-2xl font-bold">Your Products</h2>
          <Link href="/dashboard/create-product" className="w-full md:w-auto">
            <Button className="w-full bg-primary hover:bg-primary/90">+ Create Product</Button>
          </Link>
        </div>

        {products.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
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
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {product.current_owner_id === user.id ? (
                    <>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={() => setActive(product)}>
                            Transfer
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="w-full max-w-md sm:max-w-lg">
                          <DialogHeader>
                            <DialogTitle>Transfer Product</DialogTitle>
                            <DialogDescription>
                              Send ownership on-chain. This will appear instantly in the product journey.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="to">Recipient Address</Label>
                              <Input id="to" placeholder="0x..." value={toAddress} onChange={(e) => setToAddress(e.target.value)} />
                            </div>
                            <div>
                              <Label htmlFor="action">Action</Label>
                              <Input id="action" value={action} onChange={(e) => setAction(e.target.value)} />
                            </div>
                            <div>
                              <Label htmlFor="location">Location (optional)</Label>
                              <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} />
                            </div>
                            <div>
                              <Label htmlFor="notes">Notes (optional)</Label>
                              <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
                            </div>
                            {error && <div className="bg-destructive/10 text-destructive px-3 py-2 rounded text-sm">{error}</div>}
                            <div className="flex gap-2">
                              <Button disabled={!canTransfer || waitingReceipt} onClick={submitTransfer} className="flex-1 bg-primary hover:bg-primary/90">
                                {waitingReceipt ? "Transferring..." : "Confirm Transfer"}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Dialog
                        onOpenChange={(open) => {
                          if (!open && eventModal?.id === product.id) {
                            setEventModal(null)
                            resetEventForm()
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => openEventModal(product)}>
                            Log Event
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="w-full max-w-lg sm:max-w-2xl">
                          {eventModal?.id === product.id ? (
                            <>
                              <DialogHeader>
                                <DialogTitle>Log Journey Event</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="event_action">Action</Label>
                                  <Input
                                    id="event_action"
                                    placeholder="e.g., Harvested, Inspection, Transport"
                                    value={eventAction}
                                    onChange={(e) => setEventAction(e.target.value)}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="event_notes">Details / Notes</Label>
                                  <Textarea
                                    id="event_notes"
                                    placeholder="Describe what happened. Saved on-chain for the journey timeline."
                                    value={eventNotes}
                                    onChange={(e) => setEventNotes(e.target.value)}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="event_location">Location (optional)</Label>
                                  <Input
                                    id="event_location"
                                    placeholder="Farm GPS, warehouse, city..."
                                    value={eventLocation}
                                    onChange={(e) => setEventLocation(e.target.value)}
                                  />
                                </div>
                                <MediaUploader
                                  label="Journey Photos"
                                  description="Upload up to 5 images."
                                  value={eventMedia}
                                  onChange={setEventMedia}
                                />
                                {eventError && <div className="bg-destructive/10 text-destructive px-3 py-2 rounded text-sm">{eventError}</div>}
                                {eventSuccess && <div className="bg-emerald-50 text-emerald-700 px-3 py-2 rounded text-sm">{eventSuccess}</div>}
                                {eventTxHash && (
                                  <p className="text-xs text-muted-foreground break-all">Tx Hash: {eventTxHash}</p>
                                )}
                                <div className="flex gap-2">
                                  <Button
                                    disabled={waitingEventReceipt || !eventAction.trim() || !eventModal?.product_id_onchain}
                                    onClick={submitEvent}
                                    className="flex-1 bg-primary hover:bg-primary/90"
                                  >
                                    {waitingEventReceipt ? "Logging..." : "Log Event"}
                                  </Button>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="py-6 text-sm text-muted-foreground">Select a product to log events.</div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </>
                  ) : (
                    <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">Transferred</span>
                  )}
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
