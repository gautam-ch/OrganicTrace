"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi"
import { readContract } from "wagmi/actions"
import wagmiConfig from "@/lib/wagmi"
import { parseEventLogs } from "viem"
import { CERT_REGISTRY_ADDRESS, PRODUCT_TRACKER_ADDRESS, CertificationRegistryABI, ProductTrackerABI } from "@/lib/contracts"
import MediaUploader from "@/components/media/media-uploader"

export default function ProcessorDashboard({ user, profile }) {
  const [receivedProducts, setReceivedProducts] = useState([])
  const [processedProducts, setProcessedProducts] = useState([])
  const [certifications, setCertifications] = useState([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const walletAddress = useMemo(() => (profile?.wallet_address || "").toLowerCase(), [profile?.wallet_address])
  // Process modal state
  const [active, setActive] = useState(null)
  const [procName, setProcName] = useState("")
  const [batchId, setBatchId] = useState("")
  const [details, setDetails] = useState("")
  const [metadata, setMetadata] = useState("")
  const [productType, setProductType] = useState("")
  const [procMedia, setProcMedia] = useState([])
  const [procError, setProcError] = useState("")
  const [txHash, setTxHash] = useState(undefined)
  const [eventModal, setEventModal] = useState(null)
  const [eventAction, setEventAction] = useState("Processing Update")
  const [eventNotes, setEventNotes] = useState("")
  const [eventLocation, setEventLocation] = useState("")
  const [eventMedia, setEventMedia] = useState([])
  const [eventError, setEventError] = useState("")
  const [eventSuccess, setEventSuccess] = useState("")
  const [eventTxHash, setEventTxHash] = useState(undefined)
  const { address } = useAccount()
  const { writeContractAsync } = useWriteContract()
  const { data: receipt, isLoading: waitingReceipt, isSuccess: isMined } = useWaitForTransactionReceipt({ hash: txHash, confirmations: 1 })
  const { data: eventReceipt, isLoading: waitingEventReceipt, isSuccess: eventMined } = useWaitForTransactionReceipt({ hash: eventTxHash, confirmations: 1 })

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1) Fetch products assigned by this processor profile
        const { data: byUser } = await supabase
          .from("products")
          .select("*")
          .eq("current_owner_id", profile.id || user.id)
          .neq("status", "processed")

        // 2) Also fetch any unclaimed transfers that match this wallet address
        let byWallet = []
        if (walletAddress) {
          const { data: byAddr } = await supabase
            .from("products")
            .select("*")
            .is("current_owner_id", null)
            .eq("current_owner_address", walletAddress)
            .neq("status", "processed")
          byWallet = byAddr || []

          if (byWallet.length > 0) {
            const ids = byWallet.map((p) => p.id)
            await supabase
              .from("products")
              .update({ current_owner_id: profile.id || user.id })
              .in("id", ids)
          }
        }

        const { data: certsData } = await supabase
          .from("certification_requests")
          .select("*")
          .eq("farmer_id", profile.id || user.id)
          .eq("status", "approved")
          .order("updated_at", { ascending: false })

        const merged = [...(byUser || []), ...byWallet]
        const unique = Array.from(new Map(merged.map((p) => [p.id, p])).values())
        setReceivedProducts(unique)

        const { data: processed } = await supabase
          .from("products")
          .select("*")
          .eq("farmer_id", profile.id || user.id)
          .eq("status", "processed")
          .order("updated_at", { ascending: false })
        setProcessedProducts(processed || [])
        setCertifications(certsData || [])
      } catch (err) {
        console.error("[v0] Error fetching processor data:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [profile.id, user.id, walletAddress, supabase])

  // After a successful processing tx, upsert the new child product and mark parent as processed
  useEffect(() => {
    const persist = async () => {
      if (!isMined || !receipt || !active) return
      try {
        // Parse ProductCreated(productId, farmer, productName)
        const events = parseEventLogs({ abi: ProductTrackerABI, logs: receipt.logs || [], eventName: "ProductCreated" })
        const productId = events?.[0]?.args?.productId
        if (typeof productId !== "bigint") throw new Error("Could not parse productId from logs")

        if (!profile?.id) throw new Error("Profile not loaded")

        // Upsert new processed product referencing the processor profile
        const { error: upsertError } = await supabase
          .from("products")
          .upsert(
            [
              {
                farmer_id: profile.id,
                current_owner_id: profile.id,
                product_name: procName,
                product_sku: batchId,
                product_type: productType || null,
                description: metadata || null,
                status: "processed",
                product_id_onchain: Number(productId),
                last_tx_hash: receipt.transactionHash,
                current_owner_address: walletAddress || address || null,
                blockchain_hash: receipt.transactionHash,
                media: procMedia,
              },
            ],
            { onConflict: "product_id_onchain" }
          )
        if (upsertError) throw upsertError

        // Mark parent product as processed locally
        await supabase.from("products").update({ status: "processed" }).eq("id", active.id)

        // Refresh received list (remove processed parent)
        setReceivedProducts((prev) => prev.filter((p) => p.id !== active.id))

        // Refresh processed list
        const { data: processed } = await supabase
          .from("products")
          .select("*")
          .eq("farmer_id", profile.id)
          .eq("status", "processed")
          .order("updated_at", { ascending: false })
        setProcessedProducts(processed || [])
      } catch (e) {
        // Non-blocking UI error; log for devs
        console.error("persist processed product error:", e)
      } finally {
        // Reset modal state
        setActive(null)
        setProcName("")
        setBatchId("")
        setDetails("")
        setMetadata("")
        setProductType("")
        setProcMedia([])
        setProcError("")
      }
    }
    persist()
  }, [isMined, receipt, procMedia])

  useEffect(() => {
    if (!eventMined || !eventTxHash) return
    setEventSuccess("Journey event recorded on-chain.")
    setEventTxHash(undefined)
  }, [eventMined, eventTxHash])

  const resetEventForm = () => {
    setEventAction("Processing Update")
    setEventNotes("")
    setEventLocation("")
    setEventMedia([])
    setEventError("")
    setEventSuccess("")
    setEventTxHash(undefined)
  }

  const openEventModal = (product) => {
    setEventModal(product)
    setEventAction("Processing Update")
    setEventNotes("")
    setEventLocation("")
    setEventMedia([])
    setEventError("")
    setEventSuccess("")
    setEventTxHash(undefined)
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
        dashboard: "processor",
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

  const submitProcess = async () => {
    try {
      if (!active) return
      setProcError("")
      if (!PRODUCT_TRACKER_ADDRESS || !CERT_REGISTRY_ADDRESS) throw new Error("Blockchain not configured: missing addresses")
      if (!active.product_id_onchain) throw new Error("Parent product is missing on-chain id")
      if (!procName || !batchId || !details) throw new Error("Please fill required fields: name, batch id, details")

      // Verify processor is certified (contract enforces onlyCertified on createProduct)
      try {
        const ok = await readContract(wagmiConfig, {
          address: CERT_REGISTRY_ADDRESS,
          abi: CertificationRegistryABI,
          functionName: "verify",
          args: [address],
        })
        if (!ok) throw new Error("You are not certified to create products on this network")
      } catch (e) {
        const msg = String(e?.message || "")
        if (/not certified/i.test(msg)) throw e
        // If the read itself fails, still attempt the tx; contract will enforce
      }

      // Build on-chain details payload (JSON for nice rendering)
      const detailsJson = JSON.stringify({
        parent_product_id: Number(active.product_id_onchain),
        batch_id: batchId,
        processing: details,
        media: procMedia.map((m) => m.cid),
      })

      const hash = await writeContractAsync({
        address: PRODUCT_TRACKER_ADDRESS,
        abi: ProductTrackerABI,
        functionName: "createProduct",
        args: [procName, BigInt(active.product_id_onchain), detailsJson],
      })
      setTxHash(hash)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      let friendly = "Failed to process product"
      if (/Only certified farmers/i.test(msg) || /not certified/i.test(msg)) friendly = "You are not certified to create processed products"
      else if (/Parent product is missing/i.test(msg)) friendly = msg
      else if (/required fields/i.test(msg)) friendly = msg
      else if (/execution reverted|Internal JSON-RPC/i.test(msg)) friendly = "Transaction reverted. Check your certification and network."
      setProcError(friendly)
    }
  }

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
          <div className="flex items-center gap-2">
            <Link href="/dashboard/request-certification">
              <Button className="bg-primary hover:bg-primary/90">+ Request Certification</Button>
            </Link>
            <Link href="/dashboard/certification-status">
              <Button variant="outline">Check Status</Button>
            </Link>
          </div>
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
                <div className="flex items-center gap-3 mb-3">
                  {/* Process button only when we have an on-chain parent id */}
                  {product.product_id_onchain && product.status !== "processed" ? (
                    <>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={() => setActive(product)}>
                            Process
                          </Button>
                        </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Create Processed Product</DialogTitle>
                          <DialogDescription>
                            Processing from: <strong>{product.product_name}</strong> (ID: {product.product_id_onchain})
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="proc_name">New Product Name</Label>
                            <Input id="proc_name" placeholder="e.g., Organic Potato Chips" value={procName} onChange={(e) => setProcName(e.target.value)} />
                          </div>
                          <div>
                            <Label htmlFor="batch">New Product SKU / Batch ID</Label>
                            <Input id="batch" placeholder="SKU-PC-001" value={batchId} onChange={(e) => setBatchId(e.target.value)} />
                          </div>
                          <div>
                            <Label htmlFor="ptype">New Product Type (optional)</Label>
                            <Input id="ptype" placeholder="Snack Food" value={productType} onChange={(e) => setProductType(e.target.value)} />
                          </div>
                          <div>
                            <Label htmlFor="details">Processing Action Details</Label>
                            <textarea id="details" className="w-full px-3 py-2 border border-input rounded-lg bg-background min-h-24" placeholder="Describe the action taken. Saved on-chain." value={details} onChange={(e) => setDetails(e.target.value)} />
                          </div>
                          <div>
                            <Label htmlFor="meta">Additional Description (Off-Chain, optional)</Label>
                            <textarea id="meta" className="w-full px-3 py-2 border border-input rounded-lg bg-background min-h-24" placeholder="Extra details saved in the database" value={metadata} onChange={(e) => setMetadata(e.target.value)} />
                          </div>
                          <MediaUploader
                            label="Processing Photos"
                            description="Upload up to 5 images documenting this transformation."
                            value={procMedia}
                            onChange={setProcMedia}
                          />
                          {procError && <div className="bg-destructive/10 text-destructive px-3 py-2 rounded text-sm">{procError}</div>}
                          <div className="flex gap-2">
                            <Button disabled={waitingReceipt} onClick={submitProcess} className="flex-1 bg-primary hover:bg-primary/90">
                              {waitingReceipt ? "Processing..." : "Create Processed Product"}
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
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                          {eventModal?.id === product.id ? (
                            <>
                              <DialogHeader>
                                <DialogTitle>Log Journey Event</DialogTitle>
                                <DialogDescription>Share processing checkpoints with on-chain proof and media.</DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="event_action">Action</Label>
                                  <Input
                                    id="event_action"
                                    placeholder="Inspection, Packaging, QA..."
                                    value={eventAction}
                                    onChange={(e) => setEventAction(e.target.value)}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="event_notes">Details / Notes</Label>
                                  <textarea
                                    id="event_notes"
                                    className="w-full px-3 py-2 border border-input rounded-lg bg-background min-h-20"
                                    placeholder="Describe what happened."
                                    value={eventNotes}
                                    onChange={(e) => setEventNotes(e.target.value)}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="event_location">Location (optional)</Label>
                                  <Input
                                    id="event_location"
                                    placeholder="Factory, warehouse, city..."
                                    value={eventLocation}
                                    onChange={(e) => setEventLocation(e.target.value)}
                                  />
                                </div>
                                <MediaUploader
                                  label="Journey Photos"
                                  description="Upload up to 5 images. We'll pin them via Pinata automatically."
                                  value={eventMedia}
                                  onChange={setEventMedia}
                                />
                                {eventError && <div className="bg-destructive/10 text-destructive px-3 py-2 rounded text-sm">{eventError}</div>}
                                {eventSuccess && <div className="bg-emerald-50 text-emerald-700 px-3 py-2 rounded text-sm">{eventSuccess}</div>}
                                {eventTxHash && <p className="text-xs text-muted-foreground break-all">Tx Hash: {eventTxHash}</p>}
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
                    <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">Not synced on-chain</span>
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
            <p className="text-muted-foreground">No products received yet</p>
          </Card>
        )}
      </section>

      {/* Processed Products Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <h2 className="text-2xl font-bold mb-6">Processed Products</h2>

        {loading ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Loading...</p>
          </Card>
        ) : processedProducts.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-6">
            {processedProducts.map((product) => (
              <Card key={product.id || product.product_id_onchain} className="p-6 border border-border hover:border-primary transition-colors">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-semibold text-lg">{product.product_name}</h3>
                  {product.id && (
                    <Link href={`/product/${product.id}/qr`}>
                      <Badge variant="outline" className="cursor-pointer px-3 py-1 text-xs hover:scale-110">
                        Generate QR
                      </Badge>
                    </Link>
                  )}
                </div>
                <div className="space-y-2 text-sm mb-4">
                  <p>
                    <span className="text-muted-foreground">Type:</span> {product.product_type || "—"}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Status:</span> {product.status}
                  </p>
                  {product.product_id_onchain && (
                    <p className="text-xs text-muted-foreground">On-Chain ID: #{product.product_id_onchain}</p>
                  )}
                </div>
                <Link href={`/product/${product.id ?? product.product_id_onchain}`}>
                  <Button variant="outline" size="sm" className="w-full bg-transparent">
                    View Details
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No processed products yet</p>
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
