// Wallet-first auth: legacy email/password endpoint removed
import { NextResponse } from "next/server"
import { apiError } from "@/lib/api/errors"

export async function POST() {
  return apiError(410, "Email/password login has been removed.", {
    code: "DEPRECATED",
    hint: "Connect your wallet and create a profile instead.",
  })
}
