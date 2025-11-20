"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import ConnectButton from "@/components/wallet/connect-button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import MenuIcon from "@/components/icons/menu-icon"

export default function DashboardHeader() {
  return (
    <nav className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 text-base sm:text-lg">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold">OT</span>
          </div>
          <span className="font-semibold">OrganicTrace</span>
        </Link>

        <div className="hidden md:flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              Dashboard
            </Button>
          </Link>
          <Link href="/product">
            <Button variant="ghost" size="sm">
              Scan Products
            </Button>
          </Link>
          <Link href="/dashboard/request-certification">
            <Button variant="ghost" size="sm">
              Request Certification
            </Button>
          </Link>
          <ConnectButton fixed={false} />
        </div>

        <div className="md:hidden flex items-center gap-3">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-full">
                <MenuIcon className="w-5 h-5" />
                <span className="sr-only">Open navigation</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw] max-w-sm">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                    <span className="text-primary-foreground font-bold">OT</span>
                  </div>
                  <span>OrganicTrace</span>
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 flex flex-col gap-4">
                <Link href="/dashboard">
                  <Button className="w-full" variant="outline">
                    Dashboard
                  </Button>
                </Link>
                <Link href="/product">
                  <Button className="w-full" variant="outline">
                    Scan Products
                  </Button>
                </Link>
                <Link href="/dashboard/request-certification">
                  <Button className="w-full" variant="outline">
                    Request Certification
                  </Button>
                </Link>
                <ConnectButton fixed={false} fullWidthOnMobile className="w-full" />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  )
}
