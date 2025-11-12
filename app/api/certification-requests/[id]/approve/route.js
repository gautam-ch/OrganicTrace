import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { apiError, apiSuccess } from "@/lib/api/errors"

// POST /api/certification-requests/:id/approve
export async function POST(_request, { params }) {
  try {
    const supabase = await createClient()
    const id = params?.id
    if (!id) return apiError(400, "Request id is required.", { code: "ID_REQUIRED", field: "id" })

    const body = await _request.json().catch(() => ({}))
    const { walletAddress, txHash, expiry_date } = body || {}

    if (!walletAddress) return apiError(400, "Wallet address is required.", { code: "WALLET_REQUIRED", field: "walletAddress" })

    // Resolve actor profile (baseline; no certifier role check yet)
    const { data: actor, error: profErr } = await supabase
      .from("profiles")
      .select("id")
      .ilike("wallet_address", walletAddress)
      .maybeSingle()
    if (profErr) {
      console.error("[cert-req approve] profile lookup error", profErr)
      return apiError(400, "Couldn't look up profile.", { code: "PROFILE_LOOKUP_FAILED" })
    }
    if (!actor) return apiError(401, "No profile found for this wallet.", { code: "PROFILE_REQUIRED" })

    const { data, error } = await supabase
      .from("certification_requests")
      .update({
        status: "approved",
        blockchain_tx_hash: txHash || null,
        expiry_date: expiry_date || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("status", "pending")
      .select("*")
      .single()

    if (error) {
      console.error("[cert-req approve] update error", error)
      return apiError(400, "Failed to approve request.", { code: "APPROVE_FAILED" })
    }
    if (!data) return apiError(404, "Request not found or not pending.", { code: "NOT_FOUND" })

    return apiSuccess(200, { request: data })
  } catch (err) {
    console.error("[cert-req] APPROVE error", err)
    return apiError(500, "Unexpected error approving request.")
  }
}
