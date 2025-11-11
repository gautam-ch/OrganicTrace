import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const addr = searchParams.get("address") || ""

  const wallet = addr.trim()
  if (!wallet) {
    return NextResponse.json({ error: "address is required" }, { status: 400 })
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("profiles")
      .select("id, wallet_address, full_name, role, created_at, updated_at")
      .ilike("wallet_address", wallet)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (!data) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    return NextResponse.json({ profile: data })
  } catch (err) {
    console.error("[api] profile/me error:", err)
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
  }
}
