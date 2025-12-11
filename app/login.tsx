import { Link, Stack } from "expo-router"
import { StyleSheet, Text, View } from "react-native"
import GoogleSignInButton from "@/components/social-auth-buttons/google/google-sign-in-button"

export default function LoginScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Login" }} />
      <View style={styles.container}>
        <Text type="title">Login</Text>
        <GoogleSignInButton />
        <Link href="/" style={styles.link}>
          <Text type="link">Try to navigate to home screen!</Text>
        </Link>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
})
