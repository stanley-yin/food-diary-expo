import "react-native-get-random-values"
import "../global.css"
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native"
import { Stack } from "expo-router"
import { StatusBar } from "expo-status-bar"
import "react-native-reanimated"

import { SplashScreenController } from "@/components/splash-screen-controller"

import { useAuthContext } from "@/hooks/use-auth-context"
import { useColorScheme } from "@/hooks/use-color-scheme"
import AuthProvider from "@/providers/auth-provider"

// Separate RootNavigator so we can access the AuthContext
function RootNavigator() {
  const { isLoggedIn } = useAuthContext()

  return (
    <Stack>
      <Stack.Protected guard={isLoggedIn}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!isLoggedIn}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Screen name="+not-found" />
      <Stack.Screen
        name="modal/confirm"
        options={{
          presentation: "modal",
          title: "新增餐點",
        }}
      />
      <Stack.Screen
        name="modal/edit-meal"
        options={{
          presentation: "modal",
          title: "編輯餐點",
        }}
      />
      <Stack.Screen
        name="modal/camera"
        options={{
          presentation: "fullScreenModal",
          headerShown: false,
        }}
      />
    </Stack>
  )
}

export default function RootLayout() {
  const colorScheme = useColorScheme()

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <SplashScreenController />
        <RootNavigator />
        <StatusBar style="auto" />
      </AuthProvider>
    </ThemeProvider>
  )
}
