"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

export type Role = "std" | "tch" | "adm" | "owner" | "boa" | "prt"

/** Profil admin (affectation service/poste) renvoyé par /auth/me. */
export interface AdminProfile {
  serviceCode?: string | null
  serviceLabel?: string | null
  posteCode?: string | null
  posteLabel?: string | null
}

/** Établissement d'un membre (F24 : multi-établissement). */
export interface StructureInfo {
  id: number
  name: string
  role: string
  is_active: boolean
  adminProfile?: AdminProfile | null
}

export interface SessionUser {
  id: number
  email: string
  first_name?: string
  last_name?: string
  role: Role
  structureId?: number
  structureName?: string
  isSuperuser?: boolean
  /** Modules admin accessibles (service) ; vide pour un adm non configuré. */
  capabilities?: string[]
  /** Affectation admin (service/poste) ; null pour un adm non configuré. */
  adminProfile?: AdminProfile | null
  /** Établissements actifs du compte (≥1). */
  structures?: StructureInfo[]
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
