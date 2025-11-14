"use client"

import { useEffect, useMemo, useState } from "react"
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi"
import { CertificationRegistryABI, CERT_REGISTRY_ADDRESS } from "@/lib/contracts"
import { createClient as createSb } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"
import DashboardHeader from "@/components/layout/dashboard-header"

const oneYearMs = 365 * 24 * 60 * 60 * 1000

export default function CertifierDashboard() {
  const { address, isConnected } = useAccount()
  const supabase = useMemo(() => createSb(), [])
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [rejectingId, setRejectingId] = useState(null)
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)
  const [activeRejectReq, setActiveRejectReq] = useState(null)
  const [rejectReason, setRejectReason] = useState("")

  const { data: isCertifier } = useReadContract({
    abi: CertificationRegistryABI,
    address: CERT_REGISTRY_ADDRESS,
    functionName: "certifiers",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!CERT_REGISTRY_ADDRESS },
  })

  const { writeContract, data: txHash, isPending: isWriting, error: writeError } = useWriteContract()
  const { isLoading: waiting, isSuccess: confirmed } = useWaitForTransactionReceipt({ hash: txHash })

  async function loadPending() {
    setLoading(true)
    const { data, error } = await supabase
      .from("certification_requests")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
    setLoading(false)
    if (!error) setPending(data || [])
  }

  useEffect(() => {
    loadPending()
  }, [])

  useEffect(() => {
    async function afterConfirm() {
      if (!confirmed || !selected) return
      try {
        const expiry = new Date(Date.now() + oneYearMs).toISOString()
        // Pass walletAddress required by approve API
        await fetch("/api/certifications/approve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress: address, request_id: selected.id, tx_hash: txHash, expiry_date: expiry }),
        })
        setSelected(null)
        await loadPending()
      } catch (e) {
        console.error(e)
      }
    }
    afterConfirm()
  }, [confirmed])

  function openRejectModal(req) {
    setActiveRejectReq(req)
    setRejectReason("")
    setIsRejectModalOpen(true)
  }

  async function confirmReject() {
    if (!address || !activeRejectReq) return
    setRejectingId(activeRejectReq.id)
    try {
      await fetch("/api/certifications/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address, request_id: activeRejectReq.id, reason: rejectReason }),
      })
      setIsRejectModalOpen(false)
      setActiveRejectReq(null)
      setRejectReason("")
      await loadPending()
    } catch (e) {
      console.error(e)
    } finally {
      setRejectingId(null)
    }
  }

  function approveRequest(req) {
    if (!address) return
    const body = req.certification_body || "OrganicTrace"
    const expirySec = BigInt(Math.floor((Date.now() + oneYearMs) / 1000))
    setSelected(req)
    writeContract({
      abi: CertificationRegistryABI,
      address: CERT_REGISTRY_ADDRESS,
      functionName: "grantCertification",
      args: [req.farmer_address, expirySec, body],
    })
  }

  return (
     <main className="min-h-screen bg-linear-to-b from-background to-muted">
       <DashboardHeader/>
    <div className="container mx-auto p-6 mt-8">
        
      <Card>
        <CardHeader>
          <CardTitle>Certifier Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          {!isConnected ? (
            <p>Please connect your wallet to continue.</p>
          ) : !CERT_REGISTRY_ADDRESS ? (
            <p>Contract address not configured. Set NEXT_PUBLIC_CERT_REGISTRY_ADDRESS in your environment.</p>
          ) : !isCertifier ? (
            <p>Your address is not an approved certifier.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={loadPending} disabled={loading}>
                  {loading ? "Refreshing..." : "Refresh"}
                </Button>
                {isWriting && <span>Confirm the transaction in your wallet...</span>}
                {waiting && <span>Waiting for confirmation...</span>}
                {writeError && <span className="text-red-500">{String(writeError?.shortMessage || writeError?.message)}</span>}
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Applicant Name</TableHead>
                    <TableHead>Farmer/Processor Address</TableHead>
                    <TableHead>Document</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pending.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5}>No pending requests.</TableCell>
                    </TableRow>
                  )}
                  {pending.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell>{req.name}</TableCell>
                      <TableCell className="font-mono text-xs">{req.farmer_address}</TableCell>
                      <TableCell>
                        {req.document_url ? (
                          <a className="text-blue-600 underline" href={req.document_url} target="_blank" rel="noreferrer">
                            PDF
                          </a>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate">{req.notes || "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button size="sm" onClick={() => approveRequest(req)} disabled={isWriting || waiting}>
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600"
                            onClick={() => openRejectModal(req)}
                            disabled={isWriting || waiting || rejectingId === req.id}
                          >
                            {rejectingId === req.id ? "Rejecting..." : "Reject"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
      {/* Reject reason modal */}
      <Dialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Certification Request</DialogTitle>
            <DialogDescription>Enter a brief reason for rejecting this request.</DialogDescription>
          </DialogHeader>
          <div className="mt-2">
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (required)"
              rows={4}
              className="w-full rounded-md border p-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectModalOpen(false)} disabled={!!rejectingId}>
              Cancel
            </Button>
            <Button onClick={confirmReject} disabled={!!rejectingId || !rejectReason.trim()}>
              {rejectingId ? "Rejecting..." : "Reject"}
            </Button>
          </DialogFooter>
          <DialogClose />
        </DialogContent>
      </Dialog>
    </main>
  )
}

