import { useAuthContext } from "@/hooks/use-auth-context"
import * as SplashScreen from "expo-splash-screen"
import { useEffect } from "react"

void SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore if the splash screen lifecycle has already advanced.
})

export function SplashScreenController() {
  const { isLoading } = useAuthContext()

  useEffect(() => {
    if (isLoading) return

    void SplashScreen.hideAsync().catch(() => {
      // Ignore if there is no registered native splash screen for this view yet.
    })
  }, [isLoading])

  return null
}
