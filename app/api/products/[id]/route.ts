import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Fetch product with related data
    const { data: product, error } = await supabase
      .from("products")
      .select(
        `
        *,
        certifications:certification_id(*),
        product_movements(*)
      `,
      )
      .eq("id", id)
      .single()

    if (error || !product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // Fetch farmer and current owner names
    const { data: farmer } = await supabase.from("profiles").select("full_name").eq("id", product.farmer_id).single()

    const { data: owner } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", product.current_owner_id)
      .single()

    return NextResponse.json({
      ...product,
      farmer_name: farmer?.full_name || "Unknown Farmer",
      current_owner_name: owner?.full_name || "Unknown Owner",
    })
  } catch (err) {
    console.error("[v0] Error fetching product:", err)
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 })
  }
}
