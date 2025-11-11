"use client"

import DashboardHeader from "@/components/layout/dashboard-header"
import FarmerDashboard from "@/components/dashboards/farmer-dashboard"
import ProcessorDashboard from "@/components/dashboards/processor-dashboard"
import ConsumerDashboard from "@/components/dashboards/consumer-dashboard"
import { useProfile } from "@/components/auth/profile-context"
import ConnectButton from "@/components/wallet/connect-button"

export default function DashboardPage() {
  const { profile, needsSignup } = useProfile()

  return (
    <main className="min-h-screen bg-linear-to-b from-background to-muted">
      <DashboardHeader />

      {!profile && (
        <div className="p-6">
          <div className="max-w-xl mx-auto text-center space-y-3">
            <p className="text-muted-foreground">Connect your wallet to access your dashboard.</p>
            <div className="flex justify-center">
              <ConnectButton fixed={false} />
            </div>
            {needsSignup && <p className="text-sm text-muted-foreground">Create your profile to continue.</p>}
          </div>
        </div>
      )}

      {profile?.role === "farmer" && <FarmerDashboard user={{ id: profile.id }} profile={profile} />}
      {profile?.role === "processor" && <ProcessorDashboard user={{ id: profile.id }} profile={profile} />}
      {profile?.role === "consumer" && <ConsumerDashboard user={{ id: profile.id }} profile={profile} />}
    </main>
  )
}
