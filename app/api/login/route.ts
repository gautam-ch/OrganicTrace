// Wallet-first auth: legacy email/password endpoint removed
import { NextResponse } from "next/server"

export async function POST() {
  return NextResponse.json({ error: "This endpoint is deprecated. Use wallet connect." }, { status: 410 })
}
