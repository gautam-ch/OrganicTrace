"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import ConnectButton from "@/components/wallet/connect-button"
import { createClient } from "@/lib/supabase/client"

export default function DashboardHeader() {
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = "/"
  }

  return (
    <nav className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold">OT</span>
          </div>
          <span className="font-semibold">OrganicTrace</span>
        </Link>
        <div className="flex items-center gap-3">
          <ConnectButton fixed={false} />
          <Button onClick={handleLogout} variant="outline" size="sm">
            Logout
          </Button>
        </div>
      </div>
    </nav>
  )
}
