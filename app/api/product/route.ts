import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { product_name, product_sku, product_type, description, farming_practices, harvest_date, certification_id } =
      body

    const { data, error } = await supabase
      .from("products")
      .insert([
        {
          farmer_id: user.id,
          product_name,
          product_sku,
          product_type,
          description,
          farming_practices,
          harvest_date,
          certification_id,
          current_owner_id: user.id,
          status: "created",
        },
      ])
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data[0], { status: 201 })
  } catch (err) {
    console.error("[v0] Error creating product:", err)
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 })
  }
}
