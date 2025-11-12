import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { apiError, apiSuccess } from "@/lib/api/errors"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const body = await request.json().catch(() => ({}))
    const { walletAddress, to_user_id, to_address, movement_type, location, notes } = body

    if (!walletAddress) return apiError(400, "Wallet address is required.", { code: "WALLET_REQUIRED", field: "walletAddress" })

    // Resolve actor profile
    const { data: actor, error: profErr } = await supabase
      .from("profiles")
      .select("id,wallet_address")
      .ilike("wallet_address", walletAddress)
      .maybeSingle()

    if (profErr) {
      console.error("[transfer] profile lookup error", profErr)
      return apiError(400, "Couldn't look up profile.", { code: "PROFILE_LOOKUP_FAILED" })
    }
    if (!actor) return apiError(401, "No profile found for this wallet.", { code: "PROFILE_REQUIRED" })

    // Verify product exists and user owns it
    const { data: product, error: productError } = await supabase.from("products").select("*").eq("id", id).single()

    if (productError || !product) {
      return apiError(404, "Product not found.")
    }

    const ownsById = product.current_owner_id === actor.id
    const ownsByAddr = (product.current_owner_address || "").toLowerCase() === String(walletAddress).toLowerCase()
    if (!ownsById && !ownsByAddr) {
      return apiError(403, "You are not the current owner.", { code: "NOT_OWNER" })
    }

    // Record movement
    const { error: movementError } = await supabase.from("product_movements").insert([
      {
        product_id: id,
        from_user_id: actor.id,
        to_user_id: to_user_id || null,
        movement_type,
        location,
        notes,
      },
    ])

    if (movementError) {
      console.error("[transfer] movement insert error", movementError)
      return apiError(400, "Failed to record movement.", { code: "MOVE_FAILED" })
    }

    // Update product owner
    const { error: updateError } = await supabase
      .from("products")
      .update({
        current_owner_id: to_user_id || null,
        current_owner_address: to_address ? String(to_address).toLowerCase() : product.current_owner_address,
        status: "in_transit",
      })
      .eq("id", id)

    if (updateError) {
      console.error("[transfer] product update error", updateError)
      return apiError(400, "Failed to update product ownership.", { code: "UPDATE_FAILED" })
    }

    return apiSuccess(200, { ok: true })
  } catch (err) {
    console.error("[v0] Error transferring product:", err)
    return apiError(500, "Unexpected error transferring product.")
  }
}
