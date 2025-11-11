// Wallet-first auth removed email/password + JWT utilities.
// Minimal helpers for role checks and address formatting retained.

export type ProfileRole = "farmer" | "processor" | "consumer"

export function isValidRole(role: string): role is ProfileRole {
  return ["farmer", "processor", "consumer"].includes(role)
}

export function shortAddress(addr?: string | null) {
  return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : ""
}

