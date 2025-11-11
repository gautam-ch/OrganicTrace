"use client"

import React, { useState } from "react"
import { useProfile } from "@/components/auth/profile-context"
import { useAccount } from "wagmi"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"

export default function CreateProfileModal() {
  const { needsSignup, refresh, setProfile } = useProfile()
  const { address, isConnected } = useAccount()
  const [open, setOpen] = useState(true)
  const [fullName, setFullName] = useState("")
  const [role, setRole] = useState("farmer")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!address) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/profile/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address, fullName, role }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to create profile")
      } else {
        setProfile(data.profile)
        setOpen(false)
        await refresh()
      }
    } catch (err) {
      setError("Unexpected error")
    } finally {
      setLoading(false)
    }
  }

  // Only show if wallet connected, profile missing, and modal not dismissed
  const show = isConnected && needsSignup && open

  return (
    <Dialog open={show} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Your Profile</DialogTitle>
          <DialogDescription>
            Welcome {address ? address.slice(0, 6) + "..." + address.slice(-4) : ""}. Finish setup to continue.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="fullName">Name / Farm / Brand</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Blue Sky Farms"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="role">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="farmer">Farmer</SelectItem>
                <SelectItem value="processor">Processor</SelectItem>
                <SelectItem value="consumer">Consumer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Dismiss
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
