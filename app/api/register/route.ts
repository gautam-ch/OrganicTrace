// Wallet-first auth: legacy registration endpoint removed
import { NextResponse } from "next/server"
import { apiError } from "@/lib/api/errors"

export async function POST() {
  return apiError(410, "Legacy registration is no longer supported.", {
    code: "DEPRECATED",
    hint: "Connect wallet then call /api/profile/create.",
  })
}
