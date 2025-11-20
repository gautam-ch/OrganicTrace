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
    let productMedia: any[] | null = null

    // Basic env checks to provide clearer errors during setup
    const resolvedProductTracker =
      process.env.NEXT_PUBLIC_PRODUCT_TRACKER_ADDRESS || process.env.PRODUCT_TRACKER_ADDRESS
    if (!resolvedProductTracker) {
      return NextResponse.json(
        { error: "Server env PRODUCT_TRACKER_ADDRESS is not set. Deploy contracts and set .env.local/.env" },
        { status: 500 },
      )
    }
    const resolvedCertRegistry =
      process.env.NEXT_PUBLIC_CERT_REGISTRY_ADDRESS || process.env.CERT_REGISTRY_ADDRESS
    if (!resolvedCertRegistry) {
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
          media,
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
      productMedia = Array.isArray(prod.media) ? prod.media : productMedia
    }

  // Fetch product from blockchain
    const productData = await getProductDetails(productId)

    if (!productData) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // Resolve human-friendly names from Supabase where possible
  let producerName: string | null = null
    let ownerName: string | null = null

    // Try resolving via products table (preferred, authoritative mapping)
    try {
      // If request id was a UUID, we already looked up by id. Otherwise use on-chain id mapping
      const { data: prodForNames } = await supabase
        .from("products")
        .select("farmer_id,current_owner_id,media")
        .or(
          // try both lookup styles in one query
          [
            // when original param was a UUID
            `id.eq.${id}`,
            // when original param was numeric on-chain id
            productId != null ? `product_id_onchain.eq.${productId}` : "",
          ]
            .filter(Boolean)
            .join(","),
        )
        .limit(1)
        .maybeSingle()

      const userIds: string[] = []
      if (prodForNames?.farmer_id) userIds.push(prodForNames.farmer_id)
      if (prodForNames?.current_owner_id) userIds.push(prodForNames.current_owner_id)

      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id,full_name").in("id", userIds)
        const map = new Map<string, string>()
        profiles?.forEach((p: any) => {
          if (p?.id && p?.full_name) map.set(p.id, p.full_name as string)
        })
      if (!productMedia && Array.isArray(prodForNames?.media)) {
        productMedia = prodForNames.media as any[]
      }
      if (prodForNames?.farmer_id) producerName = map.get(prodForNames.farmer_id) || null
        if (prodForNames?.current_owner_id) ownerName = map.get(prodForNames.current_owner_id) || null
      }
    } catch (_) {
      // ignore name resolution errors; fallbacks below
    }

    // Fallback 1: resolve by profiles.wallet_address if available
    if (!producerName || !ownerName) {
      try {
        const addrFilters: string[] = []
        if (!producerName) addrFilters.push(`wallet_address.eq.${productData.farmer.toLowerCase()}`)
        if (!ownerName) addrFilters.push(`wallet_address.eq.${productData.currentOwner.toLowerCase()}`)
        if (addrFilters.length > 0) {
          const { data: profByAddr } = await supabase
            .from("profiles")
            .select("wallet_address,full_name")
            .or(addrFilters.join(","))
          profByAddr?.forEach((p: any) => {
            if (!p) return
            if (!producerName && p.wallet_address?.toLowerCase() === productData.farmer.toLowerCase() && p.full_name) producerName = p.full_name
            if (!ownerName && p.wallet_address?.toLowerCase() === productData.currentOwner.toLowerCase() && p.full_name) ownerName = p.full_name
          })
        }
      } catch (_) {
        // ignore
      }
    }

    // Fallback 2: use certification_requests.name for farmer wallet address
    if (!producerName) {
      try {
        const { data: reqDoc } = await supabase
          .from("certification_requests")
          .select("name")
          .eq("farmer_address", productData.farmer.toLowerCase())
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
        producerName = (reqDoc as any)?.name || null
      } catch (_) {
        // ignore
      }
    }

    // Build a stitched master journey: parent's history (if any) + child's
    let stitchedHistory: Array<{
      action: string
      actor: string
      timestamp: string
      details: string
      ipfsImageHash?: string | null
      productId: string
      productName: string
    }>
    let parentInfo: null | { id: string; name: string } = null
    let parentData: Awaited<ReturnType<typeof getProductDetails>> | null = null

    // Prefer on-chain parent id; fall back to inferring from the child's first event details JSON
    let parentIdStr: string = productData.parentProductId || "0"
    if (parentIdStr === "0" && Array.isArray(productData.history) && productData.history.length > 0) {
      try {
        const maybe = JSON.parse(productData.history[0].details || "null")
        const inferred = maybe?.parent_product_id ?? maybe?.parentProductId
        if (typeof inferred === "number" || (typeof inferred === "string" && /^\d+$/.test(inferred))) {
          parentIdStr = String(inferred)
        }
      } catch {
        // ignore
      }
    }

    if (parentIdStr !== "0") {
      parentData = await getProductDetails(Number(parentIdStr))
      if (parentData) {
        parentInfo = { id: parentData.productId, name: parentData.productName }
        const parentHist = parentData.history.map((entry: any) => ({
          action: entry.action,
          actor: formatAddress(entry.actor),
          timestamp: formatDate(entry.timestamp),
          details: entry.details,
          ipfsImageHash: entry.ipfsImageHash,
          productId: parentData!.productId,
          productName: parentData!.productName,
        }))
        let childHist: Array<{ action: string; actor: string; timestamp: string; details: string; ipfsImageHash?: string | null; productId: string; productName: string }>
          = productData.history.map((entry: any) => ({
          action: entry.action,
          actor: formatAddress(entry.actor),
          timestamp: formatDate(entry.timestamp),
          details: entry.details,
          ipfsImageHash: entry.ipfsImageHash,
          productId: productData.productId,
          productName: productData.productName,
        }))
        childHist = childHist.map((e: any, idx: number) =>
          idx === 0 && typeof e.action === "string" && e.action.toLowerCase().startsWith("harvested")
            ? { ...e, action: "Processed" }
            : e,
        )
        stitchedHistory = [...parentHist, ...childHist]
      } else {
        stitchedHistory = productData.history.map((entry: any) => ({
          action: entry.action,
          actor: formatAddress(entry.actor),
          timestamp: formatDate(entry.timestamp),
          details: entry.details,
          ipfsImageHash: entry.ipfsImageHash,
          productId: productData.productId,
          productName: productData.productName,
        }))
      }
    } else {
      stitchedHistory = productData.history.map((entry: any) => ({
        action: entry.action,
        actor: formatAddress(entry.actor),
        timestamp: formatDate(entry.timestamp),
        details: entry.details,
        ipfsImageHash: entry.ipfsImageHash,
        productId: productData.productId,
        productName: productData.productName,
      }))
    }

    // Derive origin farmer data (the base product's farmer if this is a processed good)
    const originProductData = parentData ?? productData
    const originFarmerAddress = originProductData.farmer
    let originFarmerName: string | null = parentData ? null : producerName

    if (parentData && !originFarmerName) {
      try {
        const { data: parentRecord } = await supabase
          .from("products")
          .select("farmer_id")
          .eq("product_id_onchain", Number(parentData.productId))
          .limit(1)
          .maybeSingle()

        if (parentRecord?.farmer_id) {
          const { data: parentProfile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", parentRecord.farmer_id)
            .maybeSingle()

          if (parentProfile?.full_name) {
            originFarmerName = parentProfile.full_name as string
          }
        }
      } catch (_) {
        // ignore lookup errors
      }
    }

    if (!originFarmerName) {
      try {
        const { data: originProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("wallet_address", originFarmerAddress.toLowerCase())
          .maybeSingle()

        if (originProfile?.full_name) {
          originFarmerName = originProfile.full_name as string
        }
      } catch (_) {
        // ignore lookup errors
      }
    }

    if (!originFarmerName) {
      try {
        const { data: originReq } = await supabase
          .from("certification_requests")
          .select("name")
          .eq("farmer_address", originFarmerAddress.toLowerCase())
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
        originFarmerName = (originReq as any)?.name || null
      } catch (_) {
        // ignore lookup errors
      }
    }

    // Re-evaluate certification details against the origin farmer wallet
    let documentUrl: string | null = null
    const { data: prodDocByUuid } = await supabase
      .from("products")
      .select("media, certifications:certification_id(certificate_url)")
      .eq("id", id)
      .maybeSingle()

    documentUrl = (prodDocByUuid as any)?.certifications?.certificate_url ?? null
    if (!productMedia && Array.isArray((prodDocByUuid as any)?.media)) {
      productMedia = (prodDocByUuid as any).media as any[]
    }

    if (!documentUrl && productId != null) {
      const { data: prodDocByOnchain } = await supabase
        .from("products")
        .select("media, certifications:certification_id(certificate_url)")
        .eq("product_id_onchain", productId)
        .maybeSingle()
      documentUrl = (prodDocByOnchain as any)?.certifications?.certificate_url ?? null
      if (!productMedia && Array.isArray((prodDocByOnchain as any)?.media)) {
        productMedia = (prodDocByOnchain as any).media as any[]
      }
    }

    if (!documentUrl && parentData) {
      const { data: parentDoc } = await supabase
        .from("products")
        .select("certifications:certification_id(certificate_url)")
        .eq("product_id_onchain", Number(parentData.productId))
        .maybeSingle()
      documentUrl = (parentDoc as any)?.certifications?.certificate_url ?? null
    }

    if (!documentUrl) {
      const { data: originReqDoc } = await supabase
        .from("certification_requests")
        .select("document_url")
        .eq("farmer_address", originFarmerAddress.toLowerCase())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      documentUrl = (originReqDoc as any)?.document_url ?? null
    }

    const isOriginCertified = await verifyCertification(originFarmerAddress)

    let certification: null | {
      certifier: string
      certifierFull: string
      verifiedAt: string
      txHash: string
      documentUrl?: string | null
    } = null

    if (isOriginCertified) {
      const details = await getCertificationDetails(originFarmerAddress)
      const proof = await getCertificationGrantProof(originFarmerAddress, details?.grantedAt)
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

    // Format response with readable data, including optional names and parent references
    const response = {
      product: {
        id: productData.productId,
        name: productData.productName,
        farmer: formatAddress(originFarmerAddress),
        farmerFull: originFarmerAddress,
        farmerName: originFarmerName,
        currentOwner: formatAddress(productData.currentOwner),
        currentOwnerFull: productData.currentOwner,
        currentOwnerName: ownerName || null,
        createdAt: formatDate(productData.createdAt),
        isFarmerCertified: isOriginCertified,
        certification,
        parentProductId: productData.parentProductId,
        parent: parentInfo,
        producer: {
          address: formatAddress(productData.farmer),
          addressFull: productData.farmer,
          name: producerName,
        },
        media: Array.isArray(productMedia) ? productMedia : [],
      },
      history: stitchedHistory,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Product fetch error:", error)
    const message = error instanceof Error ? error.message : "Failed to fetch product"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
