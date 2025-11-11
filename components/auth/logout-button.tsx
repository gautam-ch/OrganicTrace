"use client"

import { Button } from "@/components/ui/button"
import { useDisconnect } from "wagmi"

type Props = {
  className?: string
  variant?: any
  size?: any
  label?: string
}

export default function LogoutButton({ className, variant = "outline", size = "sm", label = "Logout" }: Props) {
  const { disconnect } = useDisconnect()

  const handleLogout = () => {
    disconnect()
    if (typeof window !== "undefined") {
      window.location.href = "/"
    }
  }

  return (
    <Button onClick={handleLogout} variant={variant} size={size} className={className}>
      {label}
    </Button>
  )
}
