import { NextRequest, NextResponse } from "next/server"
import type { UploadedMedia } from "@/types/media"

const PINATA_ENDPOINT = "https://api.pinata.cloud/pinning/pinFileToIPFS"
const MAX_FILES = 5
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB per image
const ALLOWED_MIME = /^image\//i

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const authHeaders = resolveAuthHeaders()
  if (!authHeaders) {
    return NextResponse.json({ error: "Pinata credentials are not configured" }, { status: 500 })
  }

  const formData = await request.formData()
  const files = formData.getAll("files").filter((item): item is File => item instanceof File)

  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 })
  }

  if (files.length > MAX_FILES) {
    return NextResponse.json({ error: `You can upload up to ${MAX_FILES} images at a time.` }, { status: 400 })
  }

  const gatewayBase = process.env.NEXT_PUBLIC_PINATA_GATEWAY || "https://gateway.pinata.cloud/ipfs"

  const uploads: UploadedMedia[] = []
  for (const file of files) {
    if (!ALLOWED_MIME.test(file.type || "")) {
      return NextResponse.json({ error: `Unsupported file type: ${file.type || "unknown"}` }, { status: 400 })
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `File ${file.name} exceeds the ${MAX_FILE_SIZE / (1024 * 1024)}MB limit.` }, { status: 400 })
    }

    const pinataForm = new FormData()
    pinataForm.append("file", file, file.name)
    pinataForm.append(
      "pinataMetadata",
      JSON.stringify({
        name: `organictrace-${Date.now()}-${file.name}`,
        keyvalues: { source: "organictrace", kind: "product-media" },
      }),
    )
    pinataForm.append("pinataOptions", JSON.stringify({ cidVersion: 1 }))

    const response = await fetch(PINATA_ENDPOINT, {
      method: "POST",
      headers: authHeaders,
      body: pinataForm,
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Upload failed")
      return NextResponse.json({ error: errorText || "Pinata upload failed" }, { status: 502 })
    }

    const json = await response.json().catch(() => null)
    if (!json || !json.IpfsHash) {
      return NextResponse.json({ error: "Invalid response from Pinata" }, { status: 502 })
    }

    const cid = json.IpfsHash as string
    const pinnedAt = typeof json.Timestamp === "string" ? json.Timestamp : new Date().toISOString()
    uploads.push({
      cid,
      name: file.name,
      size: file.size,
      mimeType: file.type || "application/octet-stream",
      pinnedAt,
      gatewayUrl: `${gatewayBase}/${cid}`,
    })
  }

  return NextResponse.json({ success: true, files: uploads })
}

function resolveAuthHeaders(): Record<string, string> | null {
  const jwt = process.env.PINATA_JWT || process.env.NEXT_PUBLIC_PINATA_JWT
  if (jwt) {
    return { Authorization: `Bearer ${jwt}` }
  }

  const apiKey = process.env.PINATA_API_KEY
  const apiSecret = process.env.PINATA_API_SECRET
  if (apiKey && apiSecret) {
    return {
      pinata_api_key: apiKey,
      pinata_secret_api_key: apiSecret,
    }
  }

  return null
}
