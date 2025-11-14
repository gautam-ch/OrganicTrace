import type { UploadedMedia } from "@/types/media"

const UPLOAD_ENDPOINT = "/api/pinata/upload"

export async function uploadMediaToPinata(files: File[], signal?: AbortSignal): Promise<UploadedMedia[]> {
  if (!files || files.length === 0) return []

  const formData = new FormData()
  files.forEach((file) => formData.append("files", file, file.name))

  const response = await fetch(UPLOAD_ENDPOINT, {
    method: "POST",
    body: formData,
    signal,
  })

  if (!response.ok) {
    const message = await safeParseError(response)
    throw new Error(message || "Upload failed. Please retry.")
  }

  const json = await response.json().catch(() => null)
  if (!json?.files || !Array.isArray(json.files)) {
    throw new Error("Unexpected upload response from server")
  }

  return json.files as UploadedMedia[]
}

async function safeParseError(response: Response): Promise<string | null> {
  try {
    const contentType = response.headers.get("content-type") || ""
    if (contentType.includes("application/json")) {
      const payload = await response.json()
      return payload?.error || payload?.message || null
    }
    const text = await response.text()
    return text?.slice(0, 280) || null
  } catch {
    return null
  }
}
