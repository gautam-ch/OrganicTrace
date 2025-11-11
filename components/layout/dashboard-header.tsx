"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import ConnectButton from "@/components/wallet/connect-button"

export default function DashboardHeader() {
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
        </div>
      </div>
    </nav>
  )
}
