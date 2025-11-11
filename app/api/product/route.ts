import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { isAddress } from "viem"
import { apiError, apiSuccess } from "@/lib/api/errors"

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
    if (!walletAddress) return apiError(400, "Wallet address is required.", { code: "WALLET_REQUIRED", field: "walletAddress" })
    if (!isAddress(walletAddress)) return apiError(400, "Invalid wallet address.", { code: "INVALID_ADDRESS", field: "walletAddress" })
    if (!product_name) return apiError(400, "Product name is required.", { code: "PRODUCT_NAME_REQUIRED", field: "product_name" })
    if (!product_sku) return apiError(400, "Product SKU is required.", { code: "PRODUCT_SKU_REQUIRED", field: "product_sku" })
  if (!product_type) return apiError(400, "Product type is required.", { code: "PRODUCT_TYPE_REQUIRED", field: "product_type" })
  if (!certification_id) return apiError(400, "Certification is required.", { code: "CERTIFICATION_REQUIRED", field: "certification_id" })

    // Validate harvest date format if provided
    let harvest_date: string | null = null
    if (harvest_date_raw) {
      const d = new Date(harvest_date_raw)
      if (isNaN(d.getTime())) {
        return apiError(400, "Harvest date is invalid.", { code: "INVALID_DATE", field: "harvest_date" })
      }
      harvest_date = d.toISOString().slice(0, 10) // normalize to YYYY-MM-DD
    }

    // Lookup profile by wallet (case-insensitive)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role, wallet_address")
      .ilike("wallet_address", walletAddress)
      .maybeSingle()
    if (profileError) {
      console.error("[product/create] profile lookup error", profileError)
      return apiError(400, "Couldn't look up profile.", { code: "PROFILE_LOOKUP_FAILED" })
    }
    if (!profile) return apiError(401, "No profile found for this wallet.", { code: "PROFILE_REQUIRED" })
    if (profile.role !== "farmer") return apiError(403, "Only farmers can create products.", { code: "ROLE_FORBIDDEN" })

    // Required certification check: must belong to this farmer and be currently valid/verified
    const { data: cert, error: certErr } = await supabase
      .from("certifications")
      .select("id, user_id, verified, valid_from, valid_until")
      .eq("id", certification_id)
      .eq("user_id", profile.id)
      .maybeSingle()
    if (certErr) {
      console.error("[product/create] certification lookup error", certErr)
      return apiError(400, "Couldn't verify certification.", { code: "CERT_LOOKUP_FAILED" })
    }
    if (!cert) return apiError(403, "Certification not found for this profile.", { code: "CERT_NOT_FOUND" })
    // Verify certification status and validity window
    const today = new Date()
    const from = new Date(String((cert as any).valid_from))
    const until = new Date(String((cert as any).valid_until))
    const isVerified = (cert as any).verified === true
    const inWindow = !isNaN(from.getTime()) && !isNaN(until.getTime()) && from.getTime() <= today.getTime() && today.getTime() <= until.getTime()
    if (!isVerified || !inWindow) {
      return apiError(403, "Your certification is unverified or expired.", { code: "CERT_INVALID" })
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
        return apiError(409, "You already have a product with that SKU.", { code: "SKU_CONFLICT", field: "product_sku" })
      }
      console.error("[product/create] insert error", error)
      return apiError(400, "We couldn't create the product.", { code: "CREATE_FAILED" })
    }

    return apiSuccess(201, { product: data })
  } catch (err) {
    console.error("[product] create error:", err)
    return apiError(500, "Unexpected error creating product.", { code: "UNEXPECTED" })
  }
}
