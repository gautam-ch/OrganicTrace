import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const address = typeof body?.address === "string" ? body.address : null
    if (!address) {
      return NextResponse.json({ error: "Missing address" }, { status: 400 })
    }

    const { error } = await supabase.from("profiles").update({ wallet_address: address }).eq("id", user.id)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[api] wallet save error:", err)
    return NextResponse.json({ error: "Failed to save wallet" }, { status: 500 })
  }
}
