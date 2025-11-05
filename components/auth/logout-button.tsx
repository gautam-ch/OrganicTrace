"use client"

import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

type Props = {
  className?: string
  variant?: any
  size?: any
  label?: string
}

export default function LogoutButton({ className, variant = "outline", size = "sm", label = "Logout" }: Props) {
  const supabase = createClient()

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
    } finally {
      // Refresh current page so server components re-render without session
      if (typeof window !== "undefined") {
        window.location.href = "/"
      }
    }
  }

  return (
    <Button onClick={handleLogout} variant={variant} size={size} className={className}>
      {label}
    </Button>
  )
}
