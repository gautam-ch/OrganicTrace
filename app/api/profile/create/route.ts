import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

type Body = {
  walletAddress?: string
  fullName?: string
  displayName?: string // accept legacy client naming, fallback to fullName
  role?: string
}

const ROLES = new Set(["farmer", "processor", "consumer"]) // allowed roles

export async function POST(request: Request) {
  const supabase = await createClient()

  let body: Body = {}
  try {
    body = (await request.json()) as Body
  } catch {
    // noop
  }

  const wallet = (body.walletAddress || "").trim()
  const name = (body.fullName || body.displayName || "").trim()
  const role = (body.role || "").trim().toLowerCase()

  if (!wallet) {
    return NextResponse.json({ error: "walletAddress is required" }, { status: 400 })
  }
  if (!name) {
    return NextResponse.json({ error: "fullName is required" }, { status: 400 })
  }
  if (!ROLES.has(role as any)) {
    return NextResponse.json({ error: "role must be farmer, processor, or consumer" }, { status: 400 })
  }

  try {
    // Normalize to lowercase for storage uniqueness; uniqueness is enforced by functional index
    const walletLower = wallet.toLowerCase()

    // Check if profile already exists
    const { data: existing, error: findErr } = await supabase
      .from("profiles")
      .select("id")
      .ilike("wallet_address", wallet)
      .maybeSingle()

    if (findErr) {
      return NextResponse.json({ error: findErr.message }, { status: 400 })
    }
    if (existing) {
      return NextResponse.json({ error: "Profile already exists" }, { status: 409 })
    }

    const { data, error } = await supabase
      .from("profiles")
      .insert({ wallet_address: walletLower, full_name: name, role })
      .select("id, wallet_address, full_name, role, created_at, updated_at")
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ profile: data }, { status: 201 })
  } catch (err) {
    console.error("[api] profile/create error:", err)
    return NextResponse.json({ error: "Failed to create profile" }, { status: 500 })
  }
}
