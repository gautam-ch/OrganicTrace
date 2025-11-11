import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { apiError, apiSuccess } from "@/lib/api/errors"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const addr = searchParams.get("address") || ""

  const wallet = addr.trim()
  if (!wallet) {
    return apiError(400, "Wallet address is required.", { code: "WALLET_REQUIRED", field: "address" })
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("profiles")
      .select("id, wallet_address, full_name, role, created_at, updated_at")
      .ilike("wallet_address", wallet)
      .maybeSingle()

    if (error) {
      console.error("[profile/me] query error", error)
      return apiError(400, "Couldn't look up the profile.", { code: "LOOKUP_FAILED" })
    }

    if (!data) {
      return apiError(404, "No profile found for that wallet.", { code: "NOT_FOUND" })
    }

    return apiSuccess(200, { profile: data })
  } catch (err) {
    console.error("[api] profile/me unhandled error:", err)
    return apiError(500, "Unexpected error fetching profile.", { code: "UNEXPECTED" })
  }
}
