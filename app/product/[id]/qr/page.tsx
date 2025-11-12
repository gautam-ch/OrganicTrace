"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useParams } from "next/navigation"
import QRCode from "react-qr-code"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function ProductQrPage() {
  const params = useParams()
  const idParam = Array.isArray(params?.id) ? params?.id[0] : params?.id
  const [origin, setOrigin] = useState("")
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin)
    }
  }, [])

  const productUrl = useMemo(() => {
    if (!origin || !idParam) return ""
    return `${origin}/product/${idParam}`
  }, [origin, idParam])

  const downloadPng = () => {
    if (!wrapperRef.current || !productUrl) return

    const svgNode = wrapperRef.current.querySelector("svg") as SVGSVGElement | null
    if (!svgNode) return
    const serializer = new XMLSerializer()
    const svgData = serializer.serializeToString(svgNode)
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" })
    const svgUrl = URL.createObjectURL(svgBlob)

    const image = new Image()
    const canvasSize = 1024
    image.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = canvasSize
      canvas.height = canvasSize
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        URL.revokeObjectURL(svgUrl)
        return
      }

      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, canvasSize, canvasSize)
      ctx.drawImage(image, 0, 0, canvasSize, canvasSize)

      canvas.toBlob((blob) => {
        if (!blob) {
          URL.revokeObjectURL(svgUrl)
          return
        }

        const downloadLink = document.createElement("a")
        downloadLink.href = URL.createObjectURL(blob)
        downloadLink.download = `product-${idParam}-qr.png`
        downloadLink.click()
        URL.revokeObjectURL(downloadLink.href)
        URL.revokeObjectURL(svgUrl)
      })
    }

    image.src = svgUrl
  }

  return (
    <div className="min-h-screen bg-muted/50 py-12 px-4">
      <Card className="max-w-2xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="text-center">Product QR Code</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6">
          <div className="text-sm text-muted-foreground text-center">
            {productUrl ? (
              <>
                Scan to view product details:
                <div className="mt-1 break-all text-primary">{productUrl}</div>
              </>
            ) : (
              <span>Preparing QR code...</span>
            )}
          </div>
          <div ref={wrapperRef} className="bg-white p-6 rounded-xl shadow-inner">
            <QRCode
              value={productUrl || "loading"}
              size={256}
              bgColor="#ffffff"
              fgColor="#000000"
              style={{ height: "auto", maxWidth: "100%", width: "256px" }}
            />
          </div>
          <Button onClick={downloadPng} disabled={!productUrl} className="w-full sm:w-auto">
            Download PNG
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
