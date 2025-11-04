import { type NextRequest, NextResponse } from "next/server"
import { createToken } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 })
    }

    // In a real app, you would query the database
    // Mock user for demonstration
    const mockUser = {
      id: 1,
      email: email,
      walletAddress: "0x1234567890123456789012345678901234567890",
      role: "FARMER",
      fullName: "John Farmer",
    }

    // In production, verify password hash from DB
    // For demo, accept any non-empty password
    if (password.length < 6) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const token = createToken(mockUser)

    return NextResponse.json({
      user: mockUser,
      token,
    })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Login failed" }, { status: 500 })
  }
}
