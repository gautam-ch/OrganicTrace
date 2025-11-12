import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { apiError, apiSuccess } from "@/lib/api/errors"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const body = await request.json().catch(() => ({}))
    const { user_id, walletAddress } = body || {}

    let targetUserId = user_id || null
    if (!targetUserId && walletAddress) {
      const { data: profile, error: profErr } = await supabase
        .from("profiles")
        .select("id")
        .ilike("wallet_address", walletAddress)
        .maybeSingle()
      if (profErr) {
        console.error("[verify] profile lookup error", profErr)
        return apiError(400, "Couldn't look up profile.", { code: "PROFILE_LOOKUP_FAILED" })
      }
      if (!profile) return apiError(404, "No profile found for this wallet.", { code: "PROFILE_NOT_FOUND" })
      targetUserId = profile.id
    }

    if (!targetUserId) return apiError(400, "user_id or walletAddress is required.", { code: "REQUIRED_FIELDS" })

    const { data: certifications, error } = await supabase
      .from("certifications")
      .select("*")
      .eq("user_id", targetUserId)
      .eq("verified", true)

    if (error) {
      console.error("[verify] query error", error)
      return apiError(400, "Failed to verify certifications.", { code: "VERIFY_FAILED" })
    }

    return apiSuccess(200, {
      verified: !!(certifications && certifications.length > 0),
      certifications: certifications || [],
    })
  } catch (err) {
    console.error("[v0] Error verifying certifications:", err)
    return apiError(500, "Unexpected error verifying certifications.")
  }
}
