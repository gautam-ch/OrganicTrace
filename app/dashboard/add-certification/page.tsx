"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function AddCertificationPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/dashboard/request-certification")
  }, [router])
  return null
}
