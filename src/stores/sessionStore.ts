"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

export type Role = "std" | "tch" | "adm" | "owner" | "boa" | "prt"

export interface SessionUser {
  id: number
  email: string
  first_name?: string
  last_name?: string
  role: Role
  structureId?: number
  structureName?: string
}

interface SessionState {
  user: SessionUser | null
  setUser: (user: SessionUser) => void
  clear: () => void
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      clear: () => set({ user: null }),
    }),
    { name: "jool-secondaire-session" }
  )
)
