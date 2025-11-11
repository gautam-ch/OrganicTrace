import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import WalletProvider from "@/components/wallet/wagmi-provider"
import { ProfileProvider } from "@/components/auth/profile-context"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "OrganicTrace - Blockchain Product Transparency",
  description: "Track organic products from farm to table with complete transparency and authenticity verification",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        <WalletProvider>
          <ProfileProvider>{children}</ProfileProvider>
        </WalletProvider>
        <Analytics />
      </body>
    </html>
  )
}
