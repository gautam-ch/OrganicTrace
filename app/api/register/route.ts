import { type NextRequest, NextResponse } from "next/server"
import { hashPassword, createToken } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, walletAddress, role, fullName, organization, location } = body

    // Validation
    if (!email || !password || !walletAddress || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!["FARMER", "PROCESSOR", "CONSUMER"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // In a real app, you would insert into database here
    // For now, we'll return a mock response
    const user = {
      id: Math.floor(Math.random() * 10000),
      email,
      walletAddress,
      role,
      fullName: fullName || "",
      organization: organization || "",
    }

    const token = createToken(user)

    return NextResponse.json({
      user,
      token,
      message: "User registered successfully",
    })
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json({ error: "Registration failed" }, { status: 500 })
  }
}
