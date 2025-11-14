import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { apiError, apiSuccess } from "@/lib/api/errors"

export async function POST(req) {
  try {
    const supabase = await createClient()

    const body = await req.json().catch(() => ({}))
    const { walletAddress, request_id, reason } = body || {}

    if (!walletAddress) return apiError(400, "Wallet address is required.", { code: "WALLET_REQUIRED", field: "walletAddress" })
    if (!request_id) return apiError(400, "Missing required field: request_id", { code: "REQUIRED_FIELDS" })

    // Ensure actor exists
    const { data: actor, error: profErr } = await supabase
      .from("profiles")
      .select("id")
      .ilike("wallet_address", walletAddress)
      .maybeSingle()
    if (profErr) {
      console.error("[reject] profile lookup error", profErr)
      return apiError(400, "Couldn't look up profile.", { code: "PROFILE_LOOKUP_FAILED" })
    }
    if (!actor) return apiError(401, "No profile found for this wallet.", { code: "PROFILE_REQUIRED" })

    // Perform rejection update only if currently pending
    // Save the provided reason into the existing `notes` column so no migration is required.
    const { data, error } = await supabase
      .from("certification_requests")
      .update({
        status: "rejected",
        notes: reason || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", request_id)
      .eq("status", "pending")
      .select()
      .single()

    if (error) {
      console.error("[reject] update error", error)
      return apiError(400, "Failed to reject request.", { code: "REJECT_FAILED" })
    }
    if (!data) return apiError(404, "Request not found or not pending.", { code: "NOT_FOUND" })

    return apiSuccess(200, { request: data })
  } catch (e) {
    console.error("[reject-certification]", e)
    return apiError(500, "Unexpected error rejecting request.")
  }
}
