import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { apiError, apiSuccess } from "@/lib/api/errors"

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
    return apiError(400, "Please connect your wallet first.", { code: "WALLET_REQUIRED", field: "walletAddress" })
  }
  if (!name) {
    return apiError(400, "Please enter your full name.", { code: "FULL_NAME_REQUIRED", field: "fullName" })
  }
  if (!ROLES.has(role as any)) {
    return apiError(400, "Invalid role selected.", {
      code: "INVALID_ROLE",
      field: "role",
      hint: "Choose one of: farmer, processor, consumer",
    })
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
      console.error("[profile/create] find existing error", findErr)
      return apiError(400, "Unable to check existing profile right now.", { code: "LOOKUP_FAILED" })
    }
    if (existing) {
      return apiError(409, "A profile already exists for this wallet.", { code: "PROFILE_EXISTS" })
    }

    const { data, error } = await supabase
      .from("profiles")
      .insert({ wallet_address: walletLower, full_name: name, role })
      .select("id, wallet_address, full_name, role, created_at, updated_at")
      .single()

    if (error) {
      console.error("[profile/create] insert error", error)
      return apiError(400, "We couldn't create your profile.", { code: "CREATE_FAILED" })
    }

    return apiSuccess(201, { profile: data })
  } catch (err) {
    console.error("[api] profile/create unhandled error:", err)
    return apiError(500, "Unexpected error creating profile.", { code: "UNEXPECTED" })
  }
}
