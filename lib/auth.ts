import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production"

export interface User {
  id: number
  email: string
  walletAddress: string
  role: "FARMER" | "PROCESSOR" | "CONSUMER"
  fullName?: string
  organization?: string
}

export interface AuthToken {
  userId: number
  email: string
  walletAddress: string
  role: string
}

/**
 * Hash a password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

/**
 * Verify a password against its hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * Create a JWT token
 */
export function createToken(user: User): string {
  const payload: AuthToken = {
    userId: user.id,
    email: user.email,
    walletAddress: user.walletAddress,
    role: user.role,
  }

  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" })
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): AuthToken | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthToken
  } catch (error) {
    return null
  }
}

/**
 * Extract token from Authorization header
 */
export function getTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader) return null
  const parts = authHeader.split(" ")
  if (parts.length === 2 && parts[0] === "Bearer") {
    return parts[1]
  }
  return null
}
