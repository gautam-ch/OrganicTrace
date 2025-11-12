import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { apiError, apiSuccess } from "@/lib/api/errors"

export async function POST(req) {
  try {
    const supabase = await createClient()

    const body = await req.json().catch(() => ({}))
    const { walletAddress, request_id, tx_hash, expiry_date } = body || {}

    if (!walletAddress) return apiError(400, "Wallet address is required.", { code: "WALLET_REQUIRED", field: "walletAddress" })
    if (!request_id || !tx_hash) {
      return apiError(400, "Missing required fields: request_id, tx_hash", { code: "REQUIRED_FIELDS" })
    }

    // Ensure actor exists (baseline; no role enforcement here)
    const { data: actor, error: profErr } = await supabase
      .from("profiles")
      .select("id")
      .ilike("wallet_address", walletAddress)
      .maybeSingle()
    if (profErr) {
      console.error("[approve] profile lookup error", profErr)
      return apiError(400, "Couldn't look up profile.", { code: "PROFILE_LOOKUP_FAILED" })
    }
    if (!actor) return apiError(401, "No profile found for this wallet.", { code: "PROFILE_REQUIRED" })

    // Perform approval update
    const { data, error } = await supabase
      .from("certification_requests")
      .update({
        status: "approved",
        blockchain_tx_hash: tx_hash,
        expiry_date: expiry_date ? new Date(expiry_date).toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", request_id)
      .select()
      .single()

    if (error) {
      console.error("[approve] update error", error)
      return apiError(400, "Failed to approve request.", { code: "APPROVE_FAILED" })
    }

    // Auto-create certification record if not already present (wallet-first model)
    // A certification is considered 'verified' here since an on-chain tx hash is supplied.
    if (data?.farmer_id) {
      try {
        // Check existing certification with same blockchain_tx_hash or matching expiry/name
        const { data: existingCert, error: existingErr } = await supabase
          .from("certifications")
          .select("id")
          .eq("blockchain_hash", tx_hash)
          .maybeSingle()
        if (existingErr) {
          console.warn("[approve] existing certification lookup error", existingErr)
        }
        if (!existingCert) {
          const validFrom = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
          const validUntil = data.expiry_date ? new Date(data.expiry_date).toISOString().slice(0, 10) : validFrom
          // Generate a deterministic-ish certification_number
          const base = (tx_hash || data.id || "").replace(/^0x/, "").slice(0, 12)
          const certification_number = `CERT-${base}-${Date.now().toString().slice(-6)}`
          const insertPayload = {
            user_id: data.farmer_id, // assumes FK retargeted to profiles.id
            certification_type: data.name || "organic",
            issuing_body: data.certification_body || "Unknown",
            certification_number,
            valid_from: validFrom,
            valid_until: validUntil,
            certificate_url: data.document_url || null,
            verified: true, // mark verified at approval
            blockchain_hash: tx_hash || null,
          }
          const { data: certRow, error: certErr } = await supabase
            .from("certifications")
            .insert([insertPayload])
            .select()
            .single()
          if (certErr) {
            console.error("[approve] certification insert error", certErr)
            // Non-fatal: user still sees approved request; include hint if uniqueness violation
          } else {
            return apiSuccess(200, { request: data, certification: certRow })
          }
        }
      } catch (e) {
        console.error("[approve] certification creation unexpected error", e)
      }
    }

    return apiSuccess(200, { request: data })
  } catch (e) {
    console.error("[approve-certification]", e)
    return apiError(500, "Unexpected error updating request.")
  }
}
