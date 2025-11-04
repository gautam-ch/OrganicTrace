import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { request_id, tx_hash, expiry_date } = body || {}

    if (!request_id || !tx_hash) {
      return NextResponse.json({ error: "Missing required fields: request_id, tx_hash" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("certification_requests")
      .update({
        status: "approved",
        blockchain_tx_hash: tx_hash,
        expiry_date: expiry_date ? new Date(expiry_date).toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", request_id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true, request: data })
  } catch (e) {
    console.error("[approve-certification]", e)
    return NextResponse.json({ error: "Failed to update request" }, { status: 500 })
  }
}
