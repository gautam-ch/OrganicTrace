const DEFAULT_GATEWAY = process.env.NEXT_PUBLIC_PINATA_GATEWAY || "https://gateway.pinata.cloud/ipfs"

export function toGatewayUrl(value: string, gatewayBase: string = DEFAULT_GATEWAY): string {
  if (!value) return ""
  if (/^https?:\/\//i.test(value)) return value
  const trimmed = value.replace(/^ipfs:\/\//i, "").replace(/^\//, "")
  return `${gatewayBase.replace(/\/$/, "")}/${trimmed}`
}
