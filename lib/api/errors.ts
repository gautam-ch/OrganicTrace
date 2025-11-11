import { NextResponse } from "next/server"

// Standard shape for API error responses to keep messages user-friendly and consistent.
// We intentionally avoid leaking low-level database / stack details to the client.
export interface ApiErrorMeta {
  code?: string // short machine-friendly code (e.g. REQUIRED_FIELD, INVALID_ROLE)
  field?: string // name of the field related to the error (if any)
  hint?: string // short UX hint to help user correct the issue
  details?: any // optional diagnostics (only included in non-production envs)
}

export function apiError(status: number, message: string, meta: ApiErrorMeta = {}) {
  const { code, field, hint, details } = meta
  const body: Record<string, any> = {
    success: false,
    message,
  }
  if (code) body.code = code
  if (field) body.field = field
  if (hint) body.hint = hint
  if (details && process.env.NODE_ENV !== "production") body.details = details
  return NextResponse.json(body, { status })
}

export function apiSuccess<T extends Record<string, any>>(status: number, payload: T) {
  return NextResponse.json({ success: true, ...payload }, { status })
}
