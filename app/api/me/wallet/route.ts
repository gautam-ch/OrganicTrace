import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { apiError, apiSuccess } from "@/lib/api/errors"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json().catch(() => ({}))
    const { walletAddress, profileId } = body || {}

    if (!walletAddress) return apiError(400, "Wallet address is required.", { code: "WALLET_REQUIRED", field: "walletAddress" })
    if (!profileId) return apiError(400, "Profile id is required.", { code: "PROFILE_ID_REQUIRED", field: "profileId" })

    // Ensure profile exists & matches provided id
    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", profileId)
      .maybeSingle()

    if (profErr) return apiError(400, "Couldn't look up profile.", { code: "PROFILE_LOOKUP_FAILED" })
    if (!profile) return apiError(404, "Profile not found.", { code: "NOT_FOUND" })

    const { error } = await supabase
      .from("profiles")
      .update({ wallet_address: String(walletAddress).toLowerCase() })
      .eq("id", profileId)

    if (error) return apiError(400, "Failed to update wallet address.", { code: "UPDATE_FAILED" })

    return apiSuccess(200, { ok: true })
  } catch (err) {
    console.error("[api] wallet save error:", err)
    return apiError(500, "Unexpected error updating wallet.")
  }
}
