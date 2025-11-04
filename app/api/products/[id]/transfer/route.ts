import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { to_user_id, movement_type, location, notes } = body

    // Verify product exists and user owns it
    const { data: product, error: productError } = await supabase.from("products").select("*").eq("id", id).single()

    if (productError || !product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    if (product.current_owner_id !== user.id) {
      return NextResponse.json({ error: "You don't own this product" }, { status: 403 })
    }

    // Record movement
    const { error: movementError } = await supabase.from("product_movements").insert([
      {
        product_id: id,
        from_user_id: user.id,
        to_user_id,
        movement_type,
        location,
        notes,
      },
    ])

    if (movementError) {
      return NextResponse.json({ error: movementError.message }, { status: 400 })
    }

    // Update product owner
    const { error: updateError } = await supabase
      .from("products")
      .update({
        current_owner_id: to_user_id,
        status: "in_transit",
      })
      .eq("id", id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err) {
    console.error("[v0] Error transferring product:", err)
    return NextResponse.json({ error: "Failed to transfer product" }, { status: 500 })
  }
}
