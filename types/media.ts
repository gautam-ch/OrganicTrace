export interface UploadedMedia {
  cid: string
  name: string
  size: number
  mimeType: string
  gatewayUrl: string
  pinnedAt: string
}

export type MediaArray = UploadedMedia[]
