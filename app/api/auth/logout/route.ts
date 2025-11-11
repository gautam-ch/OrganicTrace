import { NextResponse } from "next/server"

// Wallet-first auth: logout handled client-side via wagmi disconnect
export async function POST() {
  return NextResponse.json({ error: "Deprecated. Use wallet disconnect()." }, { status: 410 })
}
