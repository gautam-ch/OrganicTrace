"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from "react"
import { useAccount } from "wagmi"

export interface Profile {
  id: string
  wallet_address: string
  full_name: string | null
  role: string
  created_at?: string
  updated_at?: string
}

interface ProfileContextValue {
  profile: Profile | null
  loading: boolean
  needsSignup: boolean
  refresh: () => Promise<void>
  setProfile: (p: Profile | null) => void
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined)

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { address, isConnected } = useAccount()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(false)
  const [needsSignup, setNeedsSignup] = useState(false)

  const fetchProfile = useCallback(async () => {
    if (!isConnected || !address) {
      setProfile(null)
      setNeedsSignup(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/profile/me?address=${address}`)
      if (res.status === 404) {
        setProfile(null)
        setNeedsSignup(true)
      } else if (res.ok) {
        const data = await res.json()
        setProfile(data.profile)
        setNeedsSignup(false)
      } else {
        // treat errors as missing profile but do not force signup
        setProfile(null)
      }
    } catch (err) {
      console.error("Profile fetch error", err)
    } finally {
      setLoading(false)
    }
  }, [isConnected, address])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const value: ProfileContextValue = {
    profile,
    loading,
    needsSignup,
    refresh: fetchProfile,
    setProfile,
  }

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}

export function useProfile() {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider")
  return ctx
}
