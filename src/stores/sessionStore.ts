"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

export type Role = "std" | "tch" | "adm" | "owner" | "boa" | "prt"

interface SessionState {
  user: { id: number; email: string; role: Role; structureId?: number } | null
  setUser: (user: SessionState["user"]) => void
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
