import { supabase } from "@/lib/supabase.web"
import ThemeButton from "@/components/Button"
import React, { useState } from "react"

type SignOutButtonProps = {
  className?: string
}

export default function SignOutButton({ className = "" }: SignOutButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const onSignOutButtonPress = async () => {
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.signOut()

      if (error) {
        throw error
      }
    } catch (error) {
      console.error("Error signing out:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <ThemeButton
      title={isLoading ? "登出中..." : "登出"}
      variant="ghost"
      className={`border border-red-200 bg-red-50 ${className}`}
      disabled={isLoading}
      onPress={onSignOutButtonPress}
    />
  )
}
