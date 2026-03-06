import { Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import SignOutButton from "@/components/social-auth-buttons/sign-out-button"
import { useAuthContext } from "@/hooks/use-auth-context"
import Feather from "@expo/vector-icons/Feather"

export default function Settings() {
  const { profile, session } = useAuthContext()
  const displayName = profile?.full_name || session?.user?.email || "使用者"
  const email = session?.user?.email || "尚未提供電子郵件"

  return (
    <SafeAreaView className="flex-1 bg-slate-50 px-5">
      <View className="pb-4 pt-2">
        <Text className="text-sm text-slate-500">Preferences</Text>
        <Text className="mt-1 text-3xl font-bold text-slate-900">設定</Text>
        <Text className="mt-1 text-sm text-slate-500">
          管理帳號與常用偏好設定
        </Text>
      </View>

      <View className="gap-4">
        <View className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
          <View className="flex-row items-center gap-4 px-5 py-5">
            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-blue-100">
              <Text className="text-xl font-bold text-blue-700">
                {displayName.slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-lg font-semibold text-slate-900">
                {displayName}
              </Text>
              <Text className="mt-1 text-sm text-slate-500">{email}</Text>
            </View>
          </View>
        </View>

        <View className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
          <View className="px-5 pb-2 pt-5">
            <Text className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              App
            </Text>
          </View>

          <View className="gap-4 px-5 pb-5 pt-2">
            <View className="flex-row items-start gap-3">
              <View className="mt-0.5 h-10 w-10 items-center justify-center rounded-2xl bg-amber-100">
                <Feather name="bookmark" size={18} color="#b45309" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-slate-900">
                  餐點紀錄
                </Text>
                <Text className="mt-1 text-sm leading-5 text-slate-500">
                  你可以在新增與編輯表單中維護餐別、時間與標籤，系統也會根據歷史資料提供常用標籤建議。
                </Text>
              </View>
            </View>

            <View className="h-px bg-slate-100" />

            <View className="flex-row items-start gap-3">
              <View className="mt-0.5 h-10 w-10 items-center justify-center rounded-2xl bg-indigo-100">
                <Feather name="layout" size={18} color="#4338ca" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-slate-900">
                  Diary 顯示模式
                </Text>
                <Text className="mt-1 text-sm leading-5 text-slate-500">
                  Diary 頁現在可在多格縮圖與詳細卡片之間切換，方便快速瀏覽或完整查看每筆資訊。
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
          <View className="px-5 pb-2 pt-5">
            <Text className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Account
            </Text>
          </View>

          <View className="gap-4 px-5 pb-5 pt-2">
            <View className="flex-row items-start gap-3">
              <View className="mt-0.5 h-10 w-10 items-center justify-center rounded-2xl bg-red-100">
                <Feather name="log-out" size={18} color="#dc2626" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-slate-900">
                  登出帳號
                </Text>
                <Text className="mt-1 text-sm leading-5 text-slate-500">
                  登出後會回到登入頁，需要重新驗證後才能繼續使用。
                </Text>
              </View>
            </View>

            <SignOutButton className="w-full" />
          </View>
        </View>
      </View>
    </SafeAreaView>
  )
}
