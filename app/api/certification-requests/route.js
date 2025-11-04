import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET /api/certification-requests?status=pending
export async function GET(request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") || "pending"

    const { data, error } = await supabase
      .from("certification_requests")
      .select("*")
      .eq("status", status)
      .order("created_at", { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ requests: data || [] })
  } catch (err) {
    console.error("[cert-req] GET error", err)
    return NextResponse.json({ error: "Failed to fetch requests" }, { status: 500 })
  }
}

// POST /api/certification-requests
export async function POST(request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, farmer_address, certification_body, document_url, notes } = body || {}

    if (!name || !farmer_address) {
      return NextResponse.json({ error: "name and farmer_address are required" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("certification_requests")
      .insert({
        farmer_id: user.id,
        name,
        farmer_address,
        certification_body: certification_body || null,
        document_url: document_url || null,
        notes: notes || null,
        status: "pending",
      })
      .select("*")
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ request: data }, { status: 201 })
  } catch (err) {
    console.error("[cert-req] POST error", err)
    return NextResponse.json({ error: "Failed to create request" }, { status: 500 })
  }
}
