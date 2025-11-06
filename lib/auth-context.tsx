"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, useRef } from "react"
import { supabase } from "./supabase"
import type { Database } from "./database.types"
import type { User } from "@supabase/supabase-js"

type Profile = Database["public"]["Tables"]["profiles"]["Row"]

export interface AuthContextType {
  user: (Profile & { selectedCompanyId?: string }) | null
  loading: boolean
  error: string | null
  refreshUser: () => Promise<void>
  signOut: () => Promise<void>
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>
  signUp: (
    email: string,
    password: string,
    fullName: string,
    departmentId: string,
    phone?: string,
  ) => Promise<{ data: any; error: any }>
  setSelectedCompanyId: (companyId: string | null) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

async function fetchUserProfile(authUser: User): Promise<Profile | null> {
  try {
    const adminClient = supabase.auth.admin
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select(`
        *,
        departments!profiles_department_id_fkey (
          id,
          name
        )
      `)
      .eq("id", authUser.id)
      .maybeSingle()

    if (profileError) {
      console.error("Error fetching profile:", profileError)

      const { data: simpleProfile, error: simpleError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .maybeSingle()

      if (simpleError) {
        console.error("Error with simple profile query:", simpleError)
        return null
      }

      if (simpleProfile) {
        return simpleProfile
      }

      return null
    }

    if (profileData) {
      if (profileData.role === "admin") {
        const savedCompanyId = localStorage.getItem("selectedCompanyId")
        return { ...profileData, selectedCompanyId: savedCompanyId || undefined }
      }
      return profileData
    }
    const { data: defaultDept } = await supabase.from("departments").select("id").limit(1).maybeSingle()

    const { data: newProfile, error: createError } = await supabase
      .from("profiles")
      .insert({
        id: authUser.id,
        email: authUser.email || "",
        full_name: authUser.user_metadata?.full_name || "Usuario",
        role: "user",
        department_id: defaultDept?.id || null,
        phone: authUser.user_metadata?.phone || null,
      })
      .select(`
        *,
        departments!profiles_department_id_fkey (
          id,
          name
        )
      `)
      .maybeSingle()

    if (createError) {
      console.error("Error creating profile:", createError)
      return null
    }

    return newProfile
  } catch (error) {
    console.error("Unexpected error fetching profile:", error)
    return null
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<(Profile & { selectedCompanyId?: string }) | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const initialized = useRef(false)
  const mounted = useRef(true)
  const authSubscription = useRef<any>(null)

  const refreshUser = async () => {
    try {
      setError(null)
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      if (authUser) {
        const profile = await fetchUserProfile(authUser)
        if (mounted.current) {
          setUser(profile)
          if (!profile) {
            setError("No se pudo cargar el perfil del usuario")
          }
        }
      } else {
        if (mounted.current) {
          setUser(null)
        }
      }
    } catch (err: any) {
      console.error("Error refreshing user:", err)
      if (mounted.current) {
        setError(err.message || "Error al actualizar usuario")
      }
    }
  }

  const signOutUser = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      if (mounted.current) {
        setUser(null)
        setError(null)
      }
    } catch (err: any) {
      console.error("Error signing out:", err)
      if (mounted.current) {
        setError(err.message || "Error al cerrar sesión")
      }
    } finally {
      if (mounted.current) {
        setLoading(false)
      }
    }
  }

  const signInUser = async (email: string, password: string) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return { data, error }
      }

      if (data.user && mounted.current) {
        const profile = await fetchUserProfile(data.user)
        if (mounted.current) {
          setUser(profile)
          setLoading(false)
          if (!profile) {
            setError("No se pudo cargar el perfil del usuario")
          }
        }
      }

      return { data, error }
    } catch (err: any) {
      console.error("AUTH CONTEXT: Login error:", err)
      if (mounted.current) {
        setError(err.message || "Error al iniciar sesión")
        setLoading(false)
      }
      return { data: null, error: err }
    }
  }

  const signUpUser = async (
    email: string,
    password: string,
    fullName: string,
    departmentId: string,
    phone?: string,
  ) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            department_id: departmentId,
            phone: phone || null,
          },
        },
      })

      if (error) {
        console.error("SignUp error:", error)
      }

      return { data, error }
    } catch (err: any) {
      console.error("Unexpected signup error:", err)
      return { data: null, error: err }
    } finally {
      if (mounted.current) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    mounted.current = true

    // Función para inicializar la sesión
    const initializeAuth = async () => {
      if (initialized.current) return

      try {
        setLoading(true)
        setError(null)

        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session?.user && mounted.current) {
          const profile = await fetchUserProfile(session.user)
          if (mounted.current) {
            setUser(profile)
            if (!profile) {
              setError("No se pudo cargar el perfil del usuario")
            }
          }
        } else {
          if (mounted.current) {
            setUser(null)
          }
        }

        initialized.current = true
      } catch (err: any) {
        console.error("AUTH CONTEXT: Error initializing:", err)
        if (mounted.current) {
          setError(err.message || "Error de inicialización")
          setUser(null)
        }
      } finally {
        if (mounted.current) {
          setLoading(false)
        }
      }
    }

    initializeAuth()

    if (authSubscription.current) {
      authSubscription.current.unsubscribe()
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted.current || !initialized.current) return
      if (event === "SIGNED_OUT" || !session) {
        if (mounted.current) {
          setUser(null)
          setError(null)
          setLoading(false)
        }
      } else {
        // Manejar otros eventos de autenticación
      }
    })

    authSubscription.current = subscription

    return () => {
      mounted.current = false
      if (authSubscription.current) {
        authSubscription.current.unsubscribe()
      }
    }
  }, [])

  const setSelectedCompanyId = (companyId: string | null) => {
    if (user) {
      setUser({ ...user, selectedCompanyId: companyId || undefined })
      if (companyId) {
        localStorage.setItem("selectedCompanyId", companyId)
      } else {
        localStorage.removeItem("selectedCompanyId")
      }
    }
  }

  const value: AuthContextType = {
    user,
    loading,
    error,
    refreshUser,
    signOut: signOutUser,
    signIn: signInUser,
    signUp: signUpUser,
    setSelectedCompanyId,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
