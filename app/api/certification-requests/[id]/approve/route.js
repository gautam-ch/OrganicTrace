import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// POST /api/certification-requests/:id/approve
export async function POST(_request, { params }) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const id = params?.id
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const body = await _request.json().catch(() => ({}))
    const { txHash, expiry_date } = body || {}

    // Update status to approved; optionally store tx hash and expiry
    const { data, error } = await supabase
      .from("certification_requests")
      .update({ status: "approved", blockchain_tx_hash: txHash || null, expiry_date: expiry_date || null, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("status", "pending")
      .select("*")
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    if (!data) return NextResponse.json({ error: "Request not found or not pending" }, { status: 404 })

    return NextResponse.json({ request: data })
  } catch (err) {
    console.error("[cert-req] APPROVE error", err)
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 })
  }
}
