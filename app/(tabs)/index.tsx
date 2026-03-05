import { ScrollView, Text, TouchableOpacity, View } from "react-native"
import { useAuthContext } from "@/hooks/use-auth-context"
import * as ImagePicker from "expo-image-picker"
import { useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import Octicons from "@expo/vector-icons/Octicons"
import { supabase } from "@/lib/supabase.web"
import { useCallback, useState } from "react"
import ImageViewer from "@/components/imageViewer"
import dayjs from "dayjs"
import { useFocusEffect } from "@react-navigation/native"
import { MEAL_LABEL_MAP, type MealLabelKey } from "@/constants/meal-label"

type mealItem = {
  datetime: string
  id: string
  name?: string | null
  label?: MealLabelKey | null
  img_url: string
  food_tags: { id: string; name: string }[]
}

export default function HomeScreen() {
  const { profile } = useAuthContext()
  const router = useRouter()
  const [meals, setMeals] = useState<mealItem[]>([])

  const onSelectImage = async () => {
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      exif: true, // 讀取圖片細節 metadata
    }

    const result = await ImagePicker.launchImageLibraryAsync(options)
    if (!result.canceled) {
      const { uri, exif, fileName, mimeType } = result.assets[0]
      router.push({
        pathname: "/modal/confirm",
        params: {
          imgUri: uri,
          date: exif?.DateTimeOriginal,
          fileName: fileName,
          mimeType: mimeType,
        },
      })
    }
  }

  const getData = useCallback(async () => {
    const start = dayjs().startOf("day").toISOString()
    const end = dayjs().endOf("day").toISOString()

    const { data } = await supabase
      .from("meals")
      .select(
        `
            id,
            name,
            label,
            img_url,
            datetime,
            food_tags (
              id,
              name
            )
          `,
      )
      .gte("created_at", start) // Greater Than or Equal (>=)
      .lte("created_at", end) // Less Than or Equal (<=)
      .order("datetime", { ascending: false })

    if (!data) {
      return []
    }

    const result: mealItem[] = []
    for (let i = 0; i < data?.length; i++) {
      const item = data[i]
      const { data: imageData } = await supabase.storage
        .from("avatars")
        .createSignedUrl(item.img_url, 3600)

      const obj = {
        ...item,
        img_url: imageData?.signedUrl || "",
      }
      result.push(obj)
    }
    setMeals(result)
  }, [])

  useFocusEffect(
    useCallback(() => {
      getData()
    }, [getData]),
  )

  return (
    <SafeAreaView className="h-full bg-slate-50 px-5">
      <View className="pb-4 pt-2">
        <Text className="text-sm text-slate-500">
          Hi {profile?.full_name || "there"}
        </Text>
        <Text className="mt-1 text-3xl font-bold text-slate-900">今日飲食</Text>
        <Text className="mt-1 text-sm text-slate-500">
          {dayjs().format("YYYY/MM/DD dddd")}
        </Text>
      </View>

      <View className="mb-5 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-4">
        <Text className="text-sm text-blue-700">今天已記錄</Text>
        <Text className="mt-1 text-2xl font-bold text-blue-900">
          {meals.length} 筆餐點
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-4 pb-28"
      >
        {meals.length === 0 && (
          <View className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-10">
            <Text className="text-center text-base font-semibold text-slate-700">
              今天還沒有餐點紀錄
            </Text>
            <Text className="mt-2 text-center text-sm text-slate-500">
              點右下角按鈕，新增第一筆餐點
            </Text>
          </View>
        )}

        {meals.map((meal) => (
          <View
            key={meal.id}
            className="overflow-hidden rounded-3xl border border-slate-200 bg-white"
          >
            <ImageViewer
              imgSource={meal.img_url}
              selectedImage={meal.img_url}
              className="h-56 w-full"
            />

            <View className="gap-3 px-4 py-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-lg font-bold text-slate-900">
                  {meal.name || "未命名餐點"}
                </Text>
                {!!meal.label && (
                  <View className="rounded-full bg-amber-100 px-3 py-1">
                    <Text className="text-xs font-semibold text-amber-700">
                      {MEAL_LABEL_MAP[meal.label]}
                    </Text>
                  </View>
                )}
              </View>

              <View className="flex-row flex-wrap gap-2">
                {meal.food_tags.length === 0 && (
                  <Text className="text-sm text-slate-400">尚未標註食物標籤</Text>
                )}
                {meal.food_tags.map((item) => (
                  <View
                    key={item.id}
                    className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1"
                  >
                    <Text className="text-xs font-medium text-blue-700">
                      {item.name}
                    </Text>
                  </View>
                ))}
              </View>
              <Text className="text-xs text-slate-400">
                {dayjs(meal.datetime).format("YYYY/MM/DD HH:mm")}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity
        onPress={onSelectImage}
        className="!absolute bottom-12 right-8 z-10 h-16 w-16 items-center justify-center rounded-full bg-blue-600 shadow-xl shadow-blue-200"
      >
        <Octicons name="diff-added" size={30} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  )
}
