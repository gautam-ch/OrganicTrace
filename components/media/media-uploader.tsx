"use client"

import { useRef, useState } from "react"
import { uploadMediaToPinata } from "@/lib/pinata"
import type { UploadedMedia } from "@/types/media"
import { Button } from "@/components/ui/button"

interface MediaUploaderProps {
  label?: string
  description?: string
  value: UploadedMedia[]
  onChange: (media: UploadedMedia[]) => void
  maxItems?: number
}

export default function MediaUploader({ label = "Media", description, value, onChange, maxItems = 5 }: MediaUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const remainingSlots = Math.max(0, maxItems - value.length)

  const handleSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files
    if (!fileList || fileList.length === 0) return

    const files = Array.from(fileList).slice(0, remainingSlots)
    if (files.length === 0) {
      setError(`You can only upload up to ${maxItems} images.`)
      event.target.value = ""
      return
    }

    setUploading(true)
    setError(null)
    try {
      const uploads = await uploadMediaToPinata(files)
      onChange([...(value || []), ...uploads])
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to upload media"
      setError(msg)
    } finally {
      setUploading(false)
      event.target.value = ""
    }
  }

  const remove = (cid: string) => {
    onChange(value.filter((item) => item.cid !== cid))
    setError(null)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{label}</p>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleSelect}
          disabled={uploading || remainingSlots === 0}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading || remainingSlots === 0}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? "Uploading..." : `Add Image${remainingSlots === 1 ? "" : "s"}`}
        </Button>
      </div>

      {error && <div className="bg-destructive/10 text-destructive text-sm px-3 py-2 rounded">{error}</div>}

      {value?.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {value.map((media) => (
            <div key={media.cid} className="relative group border border-border rounded-lg overflow-hidden">
              <img
                src={media.gatewayUrl || `https://gateway.pinata.cloud/ipfs/${media.cid}`}
                alt={media.name || media.cid}
                className="h-28 w-full object-cover"
              />
              <button
                type="button"
                onClick={() => remove(media.cid)}
                className="absolute top-1 right-1 bg-black/60 text-white rounded-full px-2 py-0.5 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ✕
              </button>
              <div className="p-2 text-xs truncate">
                {media.name || media.cid}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="border border-dashed border-border rounded-lg p-6 text-center text-sm text-muted-foreground">
          {uploading ? "Uploading media..." : "No media added yet"}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {value.length}/{maxItems} images uploaded · JPG, PNG, GIF up to 10MB each
      </p>
    </div>
  )
}
