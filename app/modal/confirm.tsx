import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import ImageViewer from "@/components/imageViewer"
import * as FileSystem from "expo-file-system/legacy"
import { decode } from "base64-arraybuffer"
import { supabase } from "@/lib/supabase.web"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import DateTimePicker from "@react-native-community/datetimepicker"
import ThemeButton from "@/components/Button"
import TagInput from "@/components/TagInput"
import {
  MEAL_LABEL_MAP,
  MEAL_LABEL_OPTIONS,
  type MealLabelKey,
} from "@/constants/meal-label"

const parseExifDate = (rawDate?: string | string[]) => {
  const normalized = Array.isArray(rawDate) ? rawDate[0] : rawDate
  if (!normalized) return new Date()
  const parsed = new Date(normalized.replace(/:/, "-").replace(/:/, "-"))
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

export default function ConfirmModalScreen() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [tags, setTags] = useState<string[]>([])
  const { imgUri, date, mimeType, fileName } = Array.isArray(params)
    ? params[0]
    : params

  const { control, handleSubmit } = useForm<{
    label: MealLabelKey
    datetime: Date
  }>({
    defaultValues: {
      label: "breakfast",
      datetime: parseExifDate(date), // EXIF 不是標準 ISO 格式
    },
  })

  const uploadImage = async (data: {
    datetime: Date
    label: MealLabelKey
  }) => {
    if (!imgUri) return
    setIsLoading(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      // 1. 處理檔案轉換，supabase 需要用 base64
      const b64 = await FileSystem.readAsStringAsync(imgUri, {
        encoding: FileSystem.EncodingType.Base64,
      })
      const arrayBuffer = decode(b64)
      const filePath = `${Date.now()}_${fileName ?? "upload.jpg"}`

      // 2. 上傳圖片
      const { data: storageData, error: storageError } = await supabase.storage
        .from("avatars")
        .upload(filePath, arrayBuffer, {
          contentType: mimeType,
          upsert: true,
        })

      if (storageError) throw storageError

      const { data: meal, error: mealError } = await supabase
        .from("meals")
        .insert({
          datetime: data.datetime.toISOString(),
          label: data.label,
          user_id: user?.id,
          img_url: storageData.path, // 使用上傳成功的路徑
        })
        .select()

      if (mealError) throw mealError

      // 使用 state 中的 tags
      const tagNames = [...new Set(tags.map((tag) => tag.trim()))].filter(Boolean)
      if (tagNames.length > 0) {
        const { data: existingTags, error: existingTagsError } = await supabase
          .from("food_tags")
          .select("id, name")
          .in("name", tagNames)

        if (existingTagsError) throw existingTagsError

        const existingTagMap = new Map(
          (existingTags || []).map((item) => [item.name, item.id]),
        )
        const missingTagNames = tagNames.filter((name) => !existingTagMap.has(name))

        if (missingTagNames.length > 0) {
          const { data: insertedTags, error: insertTagsError } = await supabase
            .from("food_tags")
            .insert(missingTagNames.map((name) => ({ name })))
            .select("id, name")

          if (insertTagsError) throw insertTagsError

          for (const item of insertedTags || []) {
            existingTagMap.set(item.name, item.id)
          }
        }

        const tagIds = tagNames
          .map((name) => existingTagMap.get(name))
          .filter((id): id is string => Boolean(id))

        if (tagIds.length > 0) {
          const { error: linkError } = await supabase
            .from("meal_food_tags")
            .insert(tagIds.map((tagId) => ({ meal_id: meal[0].id, tag_id: tagId })))

          if (linkError) throw linkError
        }
      }

      console.log("upload success")
      router.back()
    } catch (e) {
      console.error("Operation failed:", e)
    } finally {
      // 無論成功或失敗，最後統一關閉 Loading
      setIsLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-slate-50"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerClassName="mx-auto w-full max-w-xl px-4 pb-10 pt-8"
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-6">
          <Text className="text-2xl font-bold text-slate-900">確認這餐內容</Text>
          <Text className="mt-1 text-sm text-slate-500">調整時間與標籤後即可上傳</Text>
        </View>

        <View className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
          <ImageViewer
            imgSource={typeof imgUri === "string" ? imgUri : ""}
            selectedImage={typeof imgUri === "string" ? imgUri : ""}
            className="h-72 w-full"
          />
        </View>

        <View className="mt-5 gap-5 rounded-3xl border border-slate-200 bg-white p-5">
          <Controller
            control={control}
            name="label"
            render={({ field: { onChange, value } }) => (
              <View className="gap-2">
                <Text className="h3">餐別</Text>
                <View className="flex-row flex-wrap gap-2">
                  {MEAL_LABEL_OPTIONS.map((option) => {
                    const isActive = value === option.value
                    return (
                      <Pressable
                        key={option.value}
                        onPress={() => onChange(option.value)}
                        className={`rounded-full border px-4 py-2 ${
                          isActive
                            ? "border-blue-600 bg-blue-600"
                            : "border-slate-200 bg-slate-50"
                        }`}
                      >
                        <Text
                          className={`text-sm font-semibold ${
                            isActive ? "text-white" : "text-slate-600"
                          }`}
                        >
                          {option.label}
                        </Text>
                      </Pressable>
                    )
                  })}
                </View>
                <Text className="text-xs text-slate-400">
                  目前選擇：{MEAL_LABEL_MAP[value]}
                </Text>
              </View>
            )}
          />

          <TagInput tags={tags} setTags={setTags} label="食物標籤" />

          <Controller
            control={control}
            name="datetime"
            render={({ field: { onChange, value } }) => (
              <View className="gap-2">
                <Text className="h3">用餐時間</Text>
                <View className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-1">
                  <DateTimePicker
                    value={value}
                    mode="datetime"
                    display="default"
                    onChange={(event, selectedDate) => {
                      if (selectedDate) onChange(selectedDate)
                    }}
                  />
                </View>
              </View>
            )}
          />
        </View>

        <View className="mt-8 flex-row gap-3">
          <ThemeButton
            size={"md"}
            variant={"ghost"}
            title="重新選擇"
            className="flex-1 border border-slate-200 bg-white"
            disabled={isLoading}
            onPress={() => router.back()}
          />
          <ThemeButton
            size={"md"}
            title={isLoading ? "上傳中..." : "上傳餐點"}
            className="flex-1"
            disabled={isLoading}
            onPress={handleSubmit(uploadImage)}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
