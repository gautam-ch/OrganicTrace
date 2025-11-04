import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import FarmerDashboard from "@/components/dashboards/farmer-dashboard"
import ProcessorDashboard from "@/components/dashboards/processor-dashboard"
import ConsumerDashboard from "@/components/dashboards/consumer-dashboard"
import DashboardHeader from "@/components/layout/dashboard-header"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (!profile) {
    redirect("/auth/signup")
  }

  return (
    <main className="min-h-screen bg-linear-to-b from-background to-muted">
          <DashboardHeader />
    
      {/* Role-Based Dashboard */}
      {profile.role === "farmer" && <FarmerDashboard user={user} profile={profile} />}
      {profile.role === "processor" && <ProcessorDashboard user={user} profile={profile} />}
      {profile.role === "consumer" && <ConsumerDashboard user={user} profile={profile} />}

    </main>
  )
}
