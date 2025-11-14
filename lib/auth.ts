// Wallet-first auth removed email/password + JWT utilities.
// Minimal helpers for role checks and address formatting retained.
import jwt, { type JwtPayload } from "jsonwebtoken"

// Wallet-first auth removed email/password + JWT utilities.
// Minimal helpers for role checks and address formatting retained, but legacy
// routes still expect a lightweight token verifier for backwards compatibility.

const JWT_SECRET = process.env.JWT_SECRET

export type ProfileRole = "farmer" | "processor" | "consumer"

export type DashboardToken = JwtPayload & {
  userId?: string
  email?: string
  walletAddress?: string
  role?: string
}

export function isValidRole(role: string): role is ProfileRole {
  return ["farmer", "processor", "consumer"].includes(role)
}

export function shortAddress(addr?: string | null) {
  return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : ""
}

export function getTokenFromHeader(headerValue?: string | null) {
  if (!headerValue) return null
  const [scheme, token] = headerValue.split(" ")
  if (!token || scheme.toLowerCase() !== "bearer") return null
  return token
}

export function verifyToken(token: string): DashboardToken | null {
  if (!JWT_SECRET) return null
  try {
    return jwt.verify(token, JWT_SECRET) as DashboardToken
  } catch (err) {
    console.warn("verifyToken failed:", err)
    return null
  }
}

