// Wallet-first auth: legacy registration endpoint removed
import { NextResponse } from "next/server"

export async function POST() {
  return NextResponse.json({ error: "This endpoint is deprecated. Use /api/profile/create after wallet connect." }, { status: 410 })
}
