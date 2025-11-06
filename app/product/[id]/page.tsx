"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import ConnectButton from "@/components/wallet/connect-button"

interface ChainProductResponse {
  product: {
    id: string
    name: string
    farmer: string // formatted (0x1234...5678)
    farmerFull: string
    farmerName?: string | null
    currentOwner: string // formatted
    currentOwnerFull?: string
    currentOwnerName?: string | null
    createdAt: string // formatted date
    isFarmerCertified: boolean
    certification?: {
      certifier: string // formatted
      certifierFull: string
      verifiedAt: string // formatted date
      txHash: string
      documentUrl?: string | null
    } | null
    parentProductId?: string
    parent?: { id: string; name: string } | null
  }
  history: Array<{
    action: string
    actor: string // formatted Address
    timestamp: string // formatted date
    details: string
    productId?: string
    productName?: string
  }>
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [data, setData] = useState<ChainProductResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [expandedEvents, setExpandedEvents] = useState<Set<number>>(new Set([0])) // First event expanded by default

  const toggleEvent = (index: number) => {
    setExpandedEvents(prev => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(`/api/product/${id}`)
        if (!response.ok) throw new Error("Product not found on chain")
        const json = await response.json()
        setData(json)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch product")
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [id])

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading product details...</p>
        </div>
      </main>
    )
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-background">
        <nav className="border-b border-border bg-background/80 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold">OT</span>
              </div>
              <span className="font-semibold">OrganicTrace</span>
            </Link>
            <div className="flex items-center gap-3">
              <ConnectButton fixed={false} />
            </div>
          </div>
        </nav>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h1 className="text-3xl font-bold mb-4">Product Not Found</h1>
          <p className="text-muted-foreground mb-8">{error}</p>
          <Link href="/product">
            <Button className="bg-primary hover:bg-primary/90">Back to Search</Button>
          </Link>
        </div>
      </main>
    )
  }

  const { product, history } = data
  const isCertified = product.isFarmerCertified
  const explorerBase = process.env.NEXT_PUBLIC_BLOCK_EXPLORER_BASE || "https://sepolia.etherscan.io"

  // --- UI helpers to render friendlier event details instead of raw JSON ---
  const tryParseJSON = (value: string): unknown | null => {
    try {
      // quick exit for obviously non-JSON strings
      if (!value || (value[0] !== "{" && value[0] !== "[")) return null
      return JSON.parse(value)
    } catch {
      return null
    }
  }

  const toTitle = (key: string): string => {
    // handle snake_case or camelCase -> Title Case
    const spaced = key
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/[_-]+/g, " ")
      .trim()
    return spaced.charAt(0).toUpperCase() + spaced.slice(1)
  }

  const getEventIcon = (action: string): string => {
    const lower = action.toLowerCase()
    if (lower.includes("harvest")) return "🌱"
    if (lower.includes("transfer")) return "🚚"
    if (lower.includes("process")) return "⚙️"
    if (lower.includes("certif")) return "✓"
    return "📦"
  }

  const getEventColor = (action: string): string => {
    const lower = action.toLowerCase()
    if (lower.includes("harvest")) return "bg-green-500"
    if (lower.includes("transfer")) return "bg-blue-500"
    if (lower.includes("process")) return "bg-purple-500"
    if (lower.includes("certif")) return "bg-emerald-500"
    return "bg-primary"
  }

  const renderDetails = (details: string, action: string, actor?: string) => {
    const parsed = tryParseJSON(details)
    if (parsed && typeof parsed === "object") {
      const entries = Object.entries(parsed as Record<string, unknown>)
      if (entries.length === 0) return null
      
      // Special rendering for transfer events
      const isTransfer = action.toLowerCase().includes("transfer")
      const obj = parsed as Record<string, unknown>
      
      if (isTransfer && (obj.to || obj.from || actor)) {
        const fromAddress = obj.from ? String(obj.from) : (actor || "—")
        return (
          <div className="rounded-md border border-border bg-muted/40 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">From</p>
                <p className="text-sm font-mono font-medium break-all">{fromAddress}</p>
              </div>
              <div className="text-primary text-xl">→</div>
              <div className="flex-1">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">To</p>
                <p className="text-sm font-mono font-medium break-all">{obj.to ? String(obj.to) : "—"}</p>
              </div>
            </div>
            {entries.filter(([k]) => k !== "from" && k !== "to").length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-border">
                {entries.filter(([k]) => k !== "from" && k !== "to").map(([k, v]) => {
                  const value = Array.isArray(v)
                    ? v.join(", ")
                    : typeof v === "object" && v !== null
                    ? JSON.stringify(v)
                    : String(v)
                  return (
                    <div key={k}>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{toTitle(k)}</p>
                      <p className="text-sm font-medium wrap-break-word">{value}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      }
      
      // Default rendering for other events
      return (
        <div className="rounded-md border border-border bg-muted/40">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
            {entries.map(([k, v]) => {
              const value = Array.isArray(v)
                ? v.join(", ")
                : typeof v === "object" && v !== null
                ? JSON.stringify(v)
                : String(v)
              return (
                <div key={k} className="p-3 border-t first:border-t-0 sm:first:border-t sm:border-l-0 border-border">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{toTitle(k)}</p>
                  <p className="text-sm font-medium wrap-break-word">{value}</p>
                </div>
              )
            })}
          </div>
        </div>
      )
    }
    // Fallback to plain text if not JSON
  return <p className="text-sm bg-muted/50 p-3 rounded wrap-break-word">{details}</p>
  }

  return (
    <main className="min-h-screen bg-linear-to-b from-background to-muted">
      {/* Navigation */}
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
            <Link href="/product">
              <Button variant="outline" size="sm">
                Back to Search
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Product Header */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className="p-8 border border-border shadow-lg">
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-2xl">
                  📦
                </div>
                <div className="flex-1">
                  <h1 className="text-3xl font-bold mb-1">{product.name}</h1>
                  {product.parent?.id && (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <span className="inline-flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                        Derived from:
                      </span>
                      <Link href={`/product/${product.parent.id}`} className="text-primary underline hover:text-primary/80 font-medium">
                        {product.parent.name || `Product #${product.parent.id}`}
                      </Link>
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-3 flex-wrap">
                {isCertified && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <button className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-sm font-medium hover:bg-green-200 transition-colors shadow-sm">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Farmer Certified
                      </button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Certification Verified</DialogTitle>
                        <DialogDescription>
                          This farmer has an active on-chain organic certification.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="mt-2 space-y-3">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Verified by</p>
                          <p className="font-medium">{product.certification?.certifier || "Unknown"}</p>
                          {product.certification?.certifierFull && (
                            <p className="text-xs text-muted-foreground">{product.certification.certifierFull}</p>
                          )}
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Verified on</p>
                          <p className="font-medium">{product.certification?.verifiedAt ?? "—"}</p>
                        </div>
                        {product.certification?.txHash && (
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Transaction</p>
                            <a
                              href={`${explorerBase}/tx/${product.certification.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary underline break-all"
                            >
                              {product.certification.txHash}
                            </a>
                          </div>
                        )}
                        {product.certification?.documentUrl && (
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Document</p>
                            <a
                              href={product.certification.documentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary underline break-all"
                            >
                              View certificate/document
                            </a>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
                <a
                  href={`${explorerBase}/address/${process.env.NEXT_PUBLIC_PRODUCT_TRACKER_ADDRESS}#readContract`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`View contract state on explorer. In Read Contract, call getProduct with ID ${product.id}.`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-secondary-foreground rounded-full text-sm font-medium hover:opacity-90 transition-opacity shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  On-Chain Product #{product.id}
                </a>
              </div>
            </div>
            <div className="text-right text-sm">
              <p className="text-muted-foreground mb-1">Created</p>
              <p className="font-medium">{product.createdAt}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-border">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 shrink-0">
                <span className="text-lg">🌱</span>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Origin Farmer</p>
                <p className="font-semibold text-lg">
                  {product.farmerName || product.farmer}
                </p>
                <p className="text-xs text-muted-foreground font-mono">{product.farmer}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 shrink-0">
                <span className="text-lg">👤</span>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Current Owner</p>
                <p className="font-semibold text-lg">
                  {product.currentOwnerName || product.currentOwner}
                </p>
                <p className="text-xs text-muted-foreground font-mono">{product.currentOwner}</p>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* Product Journey (Unified Vertical Timeline) */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">Product Journey</h2>
          
        </div>

        {history && history.length > 0 ? (
          <div className="relative">
            {/* Timeline rail */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-linear-to-b from-border via-border to-transparent" aria-hidden></div>
            <ol className="space-y-8 pl-12">
              {history.map((entry: ChainProductResponse["history"][number], index) => {
                const prev = index > 0 ? history[index - 1] : null
                const productChanged = !prev || prev.productId !== entry.productId
                const isCurrentProduct = entry.productId === product.id
                const eventIcon = getEventIcon(entry.action)
                const eventColor = getEventColor(entry.action)
                
                // Calculate time since previous event
                let timeSincePrev = ""
                if (prev) {
                  try {
                    const prevDate = new Date(prev.timestamp)
                    const currDate = new Date(entry.timestamp)
                    const diffMs = currDate.getTime() - prevDate.getTime()
                    const diffMins = Math.floor(diffMs / 60000)
                    const diffHours = Math.floor(diffMins / 60)
                    const diffDays = Math.floor(diffHours / 24)
                    
                    if (diffDays > 0) {
                      timeSincePrev = `${diffDays}d later`
                    } else if (diffHours > 0) {
                      timeSincePrev = `${diffHours}h later`
                    } else if (diffMins > 0) {
                      timeSincePrev = `${diffMins}m later`
                    }
                  } catch {}
                }

                return (
                  <li key={`${entry.action}-${index}`} className="relative group">
                    {/* Node with icon */}
                    <div className={`absolute -left-4 -top-1 w-9 h-9 rounded-full ${eventColor} border-4 border-background shadow-lg flex items-center justify-center text-white text-base transition-transform group-hover:scale-110 ${index === 0 ? 'animate-pulse-subtle' : ''}`}>
                      {eventIcon}
                    </div>
                    
                    {/* Time indicator */}
                    {timeSincePrev && (
                      <div className="absolute -left-1 -top-4 text-xs text-muted-foreground italic">
                        {timeSincePrev}
                      </div>
                    )}

                    <Collapsible open={expandedEvents.has(index)} onOpenChange={() => toggleEvent(index)}>
                      <div className="rounded-lg border border-border bg-card shadow-sm hover:shadow-md transition-all group-hover:border-primary/30">
                        <div className="p-5">
                          {/* Product label only when product changes (first or parent→child) */}
                          {productChanged && (
                            <div className="mb-3 pb-3 border-b border-border">
                              <span className="inline-flex items-center gap-2 text-xs">
                                <span className="uppercase tracking-wide text-muted-foreground font-medium">Product:</span>{" "}
                                {isCurrentProduct ? (
                                  <span className="font-semibold text-foreground bg-primary/10 px-2 py-0.5 rounded">{product.name}</span>
                                ) : (
                                  <>
                                    <Link href={`/product/${entry.productId || ""}`} className="text-primary underline hover:text-primary/80 font-medium">
                                      {entry.productName || `#${entry.productId}`}
                                    </Link>{" "}
                                    <span className="text-muted-foreground">(On-Chain #{entry.productId})</span>
                                  </>
                                )}
                              </span>
                            </div>
                          )}

                          <CollapsibleTrigger asChild>
                            <button className="w-full text-left hover:opacity-80 transition-opacity">
                              <div className="flex items-start justify-between gap-4 mb-3">
                                <div className="flex items-center gap-3">
                                  <h3 className="font-semibold text-lg">{entry.action}</h3>
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                                    {entry.action.toLowerCase().includes("harvest") ? "Origin" : 
                                     entry.action.toLowerCase().includes("transfer") ? "Movement" : 
                                     entry.action.toLowerCase().includes("process") ? "Processing" : "Event"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <time className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap font-medium">{entry.timestamp}</time>
                                  <svg 
                                    className={`w-4 h-4 text-muted-foreground transition-transform ${expandedEvents.has(index) ? 'rotate-180' : ''}`} 
                                    fill="none" 
                                    stroke="currentColor" 
                                    viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </div>
                              </div>
                            </button>
                          </CollapsibleTrigger>
                          
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="font-medium">Owner:</span>
                            <span className="font-mono text-xs">{entry.actor}</span>
                          </div>

                          {entry.details && (
                            <CollapsibleContent className="mt-4">
                              {renderDetails(entry.details, entry.action, entry.actor)}
                            </CollapsibleContent>
                          )}
                        </div>
                      </div>
                    </Collapsible>
                  </li>
                )
              })}
            </ol>
          </div>
        ) : (
          <Card className="p-12 border-2 border-dashed border-border text-center">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">📦</span>
            </div>
            <p className="text-muted-foreground font-medium mb-2">No journey recorded yet</p>
            <p className="text-sm text-muted-foreground">This product's history will appear here once events are recorded on-chain</p>
          </Card>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-muted-foreground text-sm">
          <p>OrganicTrace - All data is verified and stored securely</p>
        </div>
      </footer>
    </main>
  )
}
