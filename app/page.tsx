"use client"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import ConnectButton from "@/components/wallet/connect-button"
import { useProfile } from "@/components/auth/profile-context"
import { useAccount, useReadContract } from "wagmi"
import { CertificationRegistryABI, CERT_REGISTRY_ADDRESS } from "@/lib/contracts"

export default function Home() {
  const { profile } = useProfile()
  const { address } = useAccount()
  const contractAddress = CERT_REGISTRY_ADDRESS ? (CERT_REGISTRY_ADDRESS as `0x${string}`) : undefined
  const shouldCheckCertifier = !!address && !!contractAddress
  const { data: isCertifier } = useReadContract({
    abi: CertificationRegistryABI,
    address: contractAddress,
    functionName: "certifiers",
    args: address ? [address as `0x${string}`] : undefined,
    query: { enabled: shouldCheckCertifier },
  })
  const isCertifierAddress = typeof isCertifier === "boolean" ? isCertifier : false
  const dashboardHref = isCertifierAddress ? "/certifier-dashboard" : "/dashboard"
  const canShowDashboardLink = Boolean(profile) || isCertifierAddress
  return (
    <main className="min-h-screen bg-linear-to-b from-background to-muted">
      {/* Navigation */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold">OT</span>
            </div>
            <span className="font-semibold text-lg">OrganicTrace</span>
          </div>
          <div className="flex gap-3 items-center">
            <ConnectButton fixed={false} />
            {canShowDashboardLink ? (
              <>
                <Link href={dashboardHref}>
                  <Button variant="outline">Dashboard</Button>
                </Link>
              </>
            ) : (
              <>
                {/* Wallet-first: prompting connect via ConnectButton */}
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center space-y-6">
          <h1 className="text-5xl md:text-6xl font-bold text-foreground">Transparency From Farm to Table</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Blockchain-powered traceability ensures complete transparency and authenticity of organic products. Every
            step, verified and secure.
          </p>
          <div className="flex gap-4 justify-center pt-4">
            {!profile && <ConnectButton fixed={false} />}
            {canShowDashboardLink && (
              <Link href={dashboardHref}>
                <Button size="lg" className="bg-primary hover:bg-primary/90">
                  Go to Dashboard
                </Button>
              </Link>
            )}
            <Link href="/product">
              <Button size="lg" variant="outline">
                Scan Product
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <Card className="p-8 border border-border hover:border-primary transition-colors">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">🌾</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">For Farmers</h3>
            <p className="text-muted-foreground mb-4">
              Register your organic certification and create digital passports for each product batch. Prove your
              compliance on the blockchain.
            </p>
            {!profile && <ConnectButton fixed={false} />}
          </Card>

          {/* Feature 2 */}
          <Card className="p-8 border border-border hover:border-primary transition-colors">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">🏭</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">For Processors</h3>
            <p className="text-muted-foreground mb-4">
              Track incoming products and maintain chain of custody. Transfer products with verifiable details at each
              step.
            </p>
            {!profile && <ConnectButton fixed={false} />}
          </Card>

          {/* Feature 3 */}
          <Card className="p-8 border border-border hover:border-primary transition-colors">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">👥</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">For Consumers</h3>
            <p className="text-muted-foreground mb-4">
              Scan QR codes to view complete product history, verify organic certification, and build trust in what you
              buy.
            </p>
            <Link href="/product">
              <Button variant="outline" className="w-full bg-transparent">
                Scan a Product
              </Button>
            </Link>
          </Card>
        </div>
      </section>

      {/* Benefits */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 bg-muted/50 rounded-xl">
        <h2 className="text-3xl font-bold text-center mb-12">Why OrganicTrace</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <div className="flex gap-3">
              <span className="text-primary text-xl">✓</span>
              <div>
                <h4 className="font-semibold">Immutable Records</h4>
                <p className="text-muted-foreground text-sm">
                  All data is recorded securely, making it impossible to forge or alter records.
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex gap-3">
              <span className="text-primary text-xl">✓</span>
              <div>
                <h4 className="font-semibold">Real-time Verification</h4>
                <p className="text-muted-foreground text-sm">
                  Check certification status and product authenticity instantly at any time.
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex gap-3">
              <span className="text-primary text-xl">✓</span>
              <div>
                <h4 className="font-semibold">Complete Transparency</h4>
                <p className="text-muted-foreground text-sm">
                  Every step from harvest to retail is documented and visible to all stakeholders.
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex gap-3">
              <span className="text-primary text-xl">✓</span>
              <div>
                <h4 className="font-semibold">Consumer Trust</h4>
                <p className="text-muted-foreground text-sm">
                  Build long-term relationships with customers who value transparency and authenticity.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* System Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">Platform Features</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <Card className="p-8 border border-border">
            <h3 className="text-xl font-semibold mb-4">Traceability Mechanism</h3>
            <p className="text-muted-foreground mb-4">
              Track each stage of the organic product lifecycle including farming practices, processing, distribution,
              and retail with immutable records.
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>✓ Complete supply chain visibility</li>
              <li>✓ Product movement history</li>
              <li>✓ Environmental data tracking</li>
            </ul>
          </Card>

          <Card className="p-8 border border-border">
            <h3 className="text-xl font-semibold mb-4">Certification Verification</h3>
            <p className="text-muted-foreground mb-4">
              Verify organic certifications through secure verification methods, allowing producers to prove compliance
              and consumers to gain confidence.
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>✓ Multi-certification support</li>
              <li>✓ Expiry date tracking</li>
              <li>✓ Issuer verification</li>
            </ul>
          </Card>

          <Card className="p-8 border border-border">
            <h3 className="text-xl font-semibold mb-4">Consumer Engagement</h3>
            <p className="text-muted-foreground mb-4">
              Consumers can scan QR codes to view detailed product information, certifications, farming practices, and
              complete supply chain history.
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>✓ QR code scanning</li>
              <li>✓ Product timeline view</li>
              <li>✓ Farmer information</li>
            </ul>
          </Card>

          <Card className="p-8 border border-border">
            <h3 className="text-xl font-semibold mb-4">Role-Based Dashboard</h3>
            <p className="text-muted-foreground mb-4">
              Customized dashboards for farmers, processors, and consumers to manage their specific workflows and access
              relevant information.
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>✓ Farmer product management</li>
              <li>✓ Processor tracking</li>
              <li>✓ Consumer verification</li>
            </ul>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to Ensure Transparency?</h2>
        <p className="text-muted-foreground mb-8 text-lg">
          Join thousands of organic producers building consumer trust through complete product traceability.
        </p>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-muted-foreground text-sm mb-8">
            <p>OrganicTrace - Transparency in Every Product</p>
          </div>
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-semibold mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/product" className="hover:text-primary">
                    Track Product
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Platform</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/" className="hover:text-primary">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="/" className="hover:text-primary">
                    How It Works
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-primary">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary">
                    Blog
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-primary">
                    Privacy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary">
                    Terms
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-8 text-center text-muted-foreground text-xs">
            <p>Copyright 2024 OrganicTrace. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  )
}
