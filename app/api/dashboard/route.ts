import { type NextRequest, NextResponse } from "next/server"
import { verifyToken, getTokenFromHeader } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = getTokenFromHeader(authHeader)

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    // Return role-specific dashboard data
    const dashboardData = {
      user: {
        id: decoded.userId,
        email: decoded.email,
        walletAddress: decoded.walletAddress,
        role: decoded.role,
      },
      roleSpecific: getRoleSpecificData(decoded.role),
    }

    return NextResponse.json(dashboardData)
  } catch (error) {
    console.error("Dashboard error:", error)
    return NextResponse.json({ error: "Failed to fetch dashboard" }, { status: 500 })
  }
}

function getRoleSpecificData(role: string) {
  switch (role) {
    case "FARMER":
      return {
        section: "Farmer Dashboard",
        actions: ["Create New Product", "View My Products", "Check Certification Status"],
        description: "Manage your organic products and track their journey",
      }
    case "PROCESSOR":
      return {
        section: "Processor Dashboard",
        actions: ["View Received Products", "Process & Transfer", "Generate Reports"],
        description: "Process incoming products and maintain chain of custody",
      }
    case "CONSUMER":
      return {
        section: "Consumer Dashboard",
        actions: ["Scan QR Code", "View Product History", "Verify Authenticity"],
        description: "Verify the authenticity of products you purchase",
      }
    default:
      return {}
  }
}
