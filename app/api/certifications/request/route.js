import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 401 })
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { name, farmer_address, document_url, notes, certification_body } = body || {}

    if (!name || !farmer_address) {
      return NextResponse.json({ error: "Missing required fields: name, farmer_address" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("certification_requests")
      .insert([
        {
          farmer_id: user.id,
          farmer_address,
          name,
          document_url: document_url || null,
          notes: notes || null,
          certification_body: certification_body || null,
          status: "pending",
        },
      ])
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true, request: data })
  } catch (e) {
    console.error("[request-certification]", e)
    return NextResponse.json({ error: "Failed to create request" }, { status: 500 })
  }
}
