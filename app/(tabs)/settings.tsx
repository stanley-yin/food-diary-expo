import { Text } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import SignOutButton from "@/components/social-auth-buttons/sign-out-button"

export default function Settings() {
  return (
    <SafeAreaView className="flex items-center justify-center">
      <Text>Settings</Text>
      <SignOutButton />
    </SafeAreaView>
  )
}
