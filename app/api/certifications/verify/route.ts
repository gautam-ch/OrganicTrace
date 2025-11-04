import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Allow both authenticated users and public verification
    const body = await request.json()
    const { user_id } = body

    if (!user_id) {
      return NextResponse.json({ error: "user_id is required" }, { status: 400 })
    }

    // Fetch verified certifications for user
    const { data: certifications, error } = await supabase
      .from("certifications")
      .select("*")
      .eq("user_id", user_id)
      .eq("verified", true)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      verified: certifications && certifications.length > 0,
      certifications: certifications || [],
    })
  } catch (err) {
    console.error("[v0] Error verifying certifications:", err)
    return NextResponse.json({ error: "Failed to verify certifications" }, { status: 500 })
  }
}
