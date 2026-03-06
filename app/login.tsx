import { Stack } from "expo-router"
import { Text, View } from "react-native"
import GoogleSignInButton from "@/components/social-auth-buttons/google/google-sign-in-button"
import { SafeAreaView } from "react-native-safe-area-context"
import { Image } from "expo-image"

const HERO_MEAL_IMAGE =
  "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=80"

export default function LoginScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "登入", headerShown: false }} />
      <SafeAreaView className="flex-1 bg-slate-50 px-5">
        <View className="flex-1 justify-center py-8">
          <View className="gap-6">
            <View className="items-center gap-4">
              <View className="items-center gap-2">
                <Text className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
                  Food Diary
                </Text>
                <Text className="text-center text-4xl font-bold leading-tight text-slate-900">
                  用照片記下
                  {"\n"}
                  每一天的餐點
                </Text>
              </View>
            </View>

            <View className="overflow-hidden rounded-[32px] border border-slate-200 bg-white">
              <Image
                source={{ uri: HERO_MEAL_IMAGE }}
                style={{ width: "100%", height: 280 }}
                contentFit="cover"
              />
            </View>

            <View className="overflow-hidden rounded-[28px] border border-slate-200 bg-white">
              <View className="gap-4 px-5 py-6">
                <View className="items-center gap-1">
                  <Text className="text-lg font-semibold text-slate-900">開始使用</Text>
                  <Text className="text-center text-sm leading-5 text-slate-500">
                    使用 Google 登入以同步你的餐點紀錄。
                  </Text>
                </View>
                <GoogleSignInButton />
              </View>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </>
  )
}
