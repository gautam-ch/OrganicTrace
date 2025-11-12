import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { apiError, apiSuccess } from "@/lib/api/errors"

export async function POST(req) {
  try {
    const supabase = await createClient()

    const body = await req.json().catch(() => ({}))
    const { walletAddress, name, farmer_address, document_url, notes, certification_body } = body || {}

    if (!walletAddress) return apiError(400, "Wallet address is required.", { code: "WALLET_REQUIRED", field: "walletAddress" })
    if (!name) return apiError(400, "Name is required.", { code: "NAME_REQUIRED", field: "name" })

    // Resolve profile
    // Case-insensitive match on wallet address
    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("id,wallet_address")
      .ilike("wallet_address", walletAddress)
      .maybeSingle()

    if (profErr) {
      console.error("[certifications/request] profile lookup error", profErr)
      return apiError(400, "Couldn't look up profile.", { code: "PROFILE_LOOKUP_FAILED" })
    }
    if (!profile) return apiError(401, "No profile found for this wallet.", { code: "PROFILE_REQUIRED" })

    const farmerAddr = (farmer_address || walletAddress).toLowerCase()

    // Sanity check: ensure the resolved profile.id is actually present
    // (Catches cross-environment issues where a row is cached but not in the active DB)
    if (profile?.id) {
      const { data: sanityProfile, error: sanityErr } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", profile.id)
        .maybeSingle()

      if (sanityErr) {
        console.error("[certifications/request] profile sanity check error", sanityErr)
      }
      if (!sanityProfile) {
        return apiError(409, "Profile not found in active database.", {
          code: "PROFILE_ID_NOT_FOUND",
          hint: "The wallet exists in another DB or schema. Ensure migrations ran and you're connected to the same database.",
        })
      }
    }

    const { data, error } = await supabase
      .from("certification_requests")
      .insert([
        {
          farmer_id: profile.id,
          farmer_address: farmerAddr,
          name,
          document_url: document_url || null,
          notes: notes || null,
          certification_body: certification_body || null,
          status: "pending",
        },
      ])
      .select()
      .single()

    if (error) {
      console.error("[certifications/request] insert error", error)
      if (error.code === "23503") {
        const constraint = error?.constraint || ""
        const detail = error?.details || error?.message || ""
        const looksLikeProfilesFk = /certification_requests.*farmer_id.*profiles/i.test(`${constraint} ${detail}`)

        if (looksLikeProfilesFk) {
          return apiError(409, "Profile reference failed integrity check.", {
            code: "PROFILE_FK_VIOLATION",
            hint: `The referenced profile id ${profile?.id || "<unknown>"} is not found. Verify the profile row exists in public.profiles and migrations 005-007 are applied to the active database.`,
            constraint,
            detail,
          })
        }

        return apiError(400, "Database schema not migrated for wallet-first.", {
          code: "FK_NOT_MIGRATED",
          hint: "Run scripts/006_retarget_fks_to_profiles.sql (and 007_fix_certification_requests_fk.sql)",
          constraint,
          detail,
        })
      }
      return apiError(400, "Failed to create request.", { code: "CREATE_FAILED" })
    }

    return apiSuccess(201, { request: data })
  } catch (e) {
    console.error("[request-certification]", e)
    return apiError(500, "Unexpected error creating request.")
  }
}
