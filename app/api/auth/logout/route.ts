import { NextResponse } from "next/server"
import { apiError } from "@/lib/api/errors"

// Wallet-first auth: logout handled client-side via wagmi disconnect
export async function POST() {
  return apiError(410, "Server logout is deprecated.", {
    code: "DEPRECATED",
    hint: "Use wallet disconnect to end your session.",
  })
}
