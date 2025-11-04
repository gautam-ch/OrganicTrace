import { type NextRequest, NextResponse } from "next/server"
import { getProductDetails } from "@/lib/blockchain"
import { verifyCertification, formatDate, formatAddress } from "@/lib/blockchain"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const productId = Number.parseInt(id)

    if (isNaN(productId)) {
      return NextResponse.json({ error: "Invalid product ID" }, { status: 400 })
    }

    // Fetch product from blockchain
    const productData = await getProductDetails(productId)

    if (!productData) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // Verify farmer certification
    const isCertified = await verifyCertification(productData.farmer)

    // Format response with readable data
    const response = {
      product: {
        id: productData.productId,
        name: productData.productName,
        farmer: formatAddress(productData.farmer),
        farmerFull: productData.farmer,
        currentOwner: formatAddress(productData.currentOwner),
        createdAt: formatDate(productData.createdAt),
        isFarmerCertified: isCertified,
      },
      history: productData.history.map((entry: any) => ({
        action: entry.action,
        actor: formatAddress(entry.actor),
        timestamp: formatDate(entry.timestamp),
        details: entry.details,
      })),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Product fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 })
  }
}
