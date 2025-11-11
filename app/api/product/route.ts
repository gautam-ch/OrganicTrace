import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { isAddress } from "viem"

// Baseline wallet-first product creation (no signature yet)
// Expects body with: walletAddress, product_name, product_sku, product_type, (optional) description, farming_practices, harvest_date (YYYY-MM-DD), certification_id
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json().catch(() => ({}))

    const walletAddress: string = (body.walletAddress || "").trim()
    const product_name: string = (body.product_name || "").trim()
    const product_sku: string = (body.product_sku || "").trim()
    const product_type: string = (body.product_type || "").trim()
    const description: string | null = body.description ? String(body.description).trim() : null
    const farming_practices: string | null = body.farming_practices ? String(body.farming_practices).trim() : null
    const harvest_date_raw: string | null = body.harvest_date ? String(body.harvest_date).trim() : null
  const certification_id: string | null = body.certification_id ? String(body.certification_id).trim() : null

    // Basic validations
    if (!walletAddress) return NextResponse.json({ error: "walletAddress is required" }, { status: 400 })
    if (!isAddress(walletAddress)) return NextResponse.json({ error: "walletAddress is not a valid Ethereum address" }, { status: 400 })
    if (!product_name) return NextResponse.json({ error: "product_name is required" }, { status: 400 })
    if (!product_sku) return NextResponse.json({ error: "product_sku is required" }, { status: 400 })
  if (!product_type) return NextResponse.json({ error: "product_type is required" }, { status: 400 })
  if (!certification_id) return NextResponse.json({ error: "certification_id is required" }, { status: 400 })

    // Validate harvest date format if provided
    let harvest_date: string | null = null
    if (harvest_date_raw) {
      const d = new Date(harvest_date_raw)
      if (isNaN(d.getTime())) {
        return NextResponse.json({ error: "harvest_date is invalid date" }, { status: 400 })
      }
      harvest_date = d.toISOString().slice(0, 10) // normalize to YYYY-MM-DD
    }

    // Lookup profile by wallet (case-insensitive)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role, wallet_address")
      .ilike("wallet_address", walletAddress)
      .maybeSingle()
    if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 })
    if (!profile) return NextResponse.json({ error: "Profile not found for wallet" }, { status: 401 })
    if (profile.role !== "farmer") return NextResponse.json({ error: "Role 'farmer' required" }, { status: 403 })

    // Required certification check: must belong to this farmer and be currently valid/verified
    const { data: cert, error: certErr } = await supabase
      .from("certifications")
      .select("id, user_id, verified, valid_from, valid_until")
      .eq("id", certification_id)
      .eq("user_id", profile.id)
      .maybeSingle()
    if (certErr) return NextResponse.json({ error: certErr.message }, { status: 400 })
    if (!cert) return NextResponse.json({ error: "certification_id not found for this farmer" }, { status: 403 })
    // Verify certification status and validity window
    const today = new Date()
    const from = new Date(String((cert as any).valid_from))
    const until = new Date(String((cert as any).valid_until))
    const isVerified = (cert as any).verified === true
    const inWindow = !isNaN(from.getTime()) && !isNaN(until.getTime()) && from.getTime() <= today.getTime() && today.getTime() <= until.getTime()
    if (!isVerified || !inWindow) {
      return NextResponse.json({ error: "A valid, verified certification is required to create products" }, { status: 403 })
    }

    // Insert product with farmer as current owner
    const insertPayload = {
      farmer_id: profile.id,
      product_name,
      product_sku,
      product_type,
      description,
      farming_practices,
      harvest_date,
      certification_id,
      current_owner_id: profile.id,
      current_owner_address: walletAddress.toLowerCase(),
      status: "created",
    }

    const { data, error } = await supabase.from("products").insert([insertPayload]).select().single()

    if (error) {
      // Map unique constraint error (SKU) to 409 if detected
      if (/duplicate key value/.test(error.message) && /products_farmer_id_product_sku_key/.test(error.message)) {
        return NextResponse.json({ error: "SKU already exists for this farmer", code: "SKU_CONFLICT" }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ product: data }, { status: 201 })
  } catch (err) {
    console.error("[product] create error:", err)
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 })
  }
}
