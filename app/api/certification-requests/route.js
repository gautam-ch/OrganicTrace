import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { apiError, apiSuccess } from "@/lib/api/errors"

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

    if (error) return apiError(400, "Failed to fetch requests.")

    return apiSuccess(200, { requests: data || [] })
  } catch (err) {
    console.error("[cert-req] GET error", err)
    return apiError(500, "Unexpected error fetching requests.")
  }
}

// POST /api/certification-requests
export async function POST(request) {
  try {
    const supabase = await createClient()

    const body = await request.json().catch(() => ({}))
    const { walletAddress, name, farmer_address, certification_body, document_url, notes } = body || {}

    if (!walletAddress) return apiError(400, "Wallet address is required.", { code: "WALLET_REQUIRED", field: "walletAddress" })
    if (!name) return apiError(400, "Name is required.", { code: "NAME_REQUIRED", field: "name" })

    // Resolve farmer profile by wallet
    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("id,wallet_address")
      .ilike("wallet_address", walletAddress)
      .maybeSingle()

    if (profErr) {
      console.error("[cert-req] profile lookup error", profErr)
      return apiError(400, "Couldn't look up profile.", { code: "PROFILE_LOOKUP_FAILED" })
    }
    if (!profile) return apiError(401, "No profile found for this wallet.", { code: "PROFILE_REQUIRED" })

    const farmerAddr = (farmer_address || walletAddress).toLowerCase()

    const { data, error } = await supabase
      .from("certification_requests")
      .insert({
        farmer_id: profile.id,
        name,
        farmer_address: farmerAddr,
        certification_body: certification_body || null,
        document_url: document_url || null,
        notes: notes || null,
        status: "pending",
      })
      .select("*")
      .single()

    if (error) {
      console.error("[cert-req] insert error", error)
      return apiError(400, "Failed to create certification request.", { code: "CREATE_FAILED" })
    }

    return apiSuccess(201, { request: data })
  } catch (err) {
    console.error("[cert-req] POST error", err)
    return apiError(500, "Unexpected error creating request.")
  }
}
