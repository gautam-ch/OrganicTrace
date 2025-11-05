import { type NextRequest, NextResponse } from "next/server"
import {
  getProductDetails,
  verifyCertification,
  formatDate,
  formatAddress,
  getCertificationDetails,
  getCertificationGrantProof,
} from "@/lib/blockchain"
import { createClient as createSb } from "@/lib/supabase/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Basic env checks to provide clearer errors during setup
    if (!process.env.PRODUCT_TRACKER_ADDRESS) {
      return NextResponse.json(
        { error: "Server env PRODUCT_TRACKER_ADDRESS is not set. Deploy contracts and set .env.local/.env" },
        { status: 500 },
      )
    }
    if (!process.env.CERT_REGISTRY_ADDRESS) {
      return NextResponse.json(
        { error: "Server env CERT_REGISTRY_ADDRESS is not set. Deploy contracts and set .env.local/.env" },
        { status: 500 },
      )
    }

    // Accept either numeric on-chain id or UUID from Supabase and map to on-chain id
    const supabase = await createSb()
    let productId: number | null = null
    if (/^\d+$/.test(id)) {
      productId = Number.parseInt(id, 10)
    } else {
      // Resolve UUID -> on-chain id via Supabase
      const { data: prod, error: prodErr } = await supabase
        .from("products")
        .select(
          `
          product_id_onchain,
          certification_id,
          certifications:certification_id(certificate_url)
        `,
        )
        .eq("id", id)
        .maybeSingle()

      if (prodErr) {
        return NextResponse.json({ error: prodErr.message }, { status: 400 })
      }
      if (!prod || prod.product_id_onchain == null) {
        return NextResponse.json({ error: "No on-chain mapping found for this product" }, { status: 404 })
      }
      productId = Number(prod.product_id_onchain)
    }

    // Fetch product from blockchain
    const productData = await getProductDetails(productId)

    if (!productData) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // Verify farmer certification
    const isCertified = await verifyCertification(productData.farmer)

    // Optionally fetch certification proof
    let certification: null | {
      certifier: string
      certifierFull: string
      verifiedAt: string
      txHash: string
      documentUrl?: string | null
    } = null

    // Try to retrieve an accompanying certification document URL from Supabase
    let documentUrl: string | null = null
    // First, try from the products -> certifications relation by UUID if provided
    const { data: prodDocByUuid } = await supabase
      .from("products")
      .select("certifications:certification_id(certificate_url)")
      .eq("id", id)
      .maybeSingle()

    documentUrl = (prodDocByUuid as any)?.certifications?.certificate_url ?? null

    // If not found and we do have an on-chain product id, resolve by product_id_onchain
    if (!documentUrl && productId != null) {
      const { data: prodDocByOnchain } = await supabase
        .from("products")
        .select("certifications:certification_id(certificate_url)")
        .eq("product_id_onchain", productId)
        .maybeSingle()
      documentUrl = (prodDocByOnchain as any)?.certifications?.certificate_url ?? null
    }

    // Fallback: look up the latest certification request document for this farmer wallet
    if (!documentUrl) {
      const { data: reqDoc } = await supabase
        .from("certification_requests")
        .select("document_url")
        .eq("farmer_address", productData.farmer)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      documentUrl = (reqDoc as any)?.document_url ?? null
    }

    if (isCertified) {
      const details = await getCertificationDetails(productData.farmer)
      const proof = await getCertificationGrantProof(productData.farmer)
      if (details) {
        certification = {
          certifier: proof?.certifier ? formatAddress(proof.certifier) : "Unknown",
          certifierFull: proof?.certifier || "",
          verifiedAt: formatDate(details.grantedAt),
          txHash: proof?.txHash || "",
          documentUrl,
        }
      }
    }

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
        certification,
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
    const message = error instanceof Error ? error.message : "Failed to fetch product"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
