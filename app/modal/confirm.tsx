import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
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

  const { control, handleSubmit } = useForm({
    defaultValues: {
      name: "",
      datetime: parseExifDate(date), // EXIF 不是標準 ISO 格式
    },
  })

  const uploadImage = async (data: { datetime: Date; name: string }) => {
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
          name: data.name,
          user_id: user?.id,
          img_url: storageData.path, // 使用上傳成功的路徑
        })
        .select()

      if (mealError) throw mealError

      // 使用 state 中的 tags
      const tagNames = tags
      if (tagNames.length > 0) {
        // 2. 批量處理標籤 (使用 upsert：若名稱重複則不新增，直接回傳)
        const tagObjects = tagNames.map((name) => ({ name }))
        const { data: tagsData, error: tagError } = await supabase
          .from("food_tags")
          .upsert(tagObjects, { onConflict: "name" }) // 根據 name 判斷是否重複
          .select()

        if (tagError) {
          console.error("Error upserting tags:", tagError)
          // 決定是否要中斷流程
        } else if (tagsData) {
          // 3. 建立關聯到橋接表 meal_food_tags
          const junctionData = tagsData.map((tag) => ({
            meal_id: meal[0].id,
            tag_id: tag.id,
          }))

          const { error: linkError } = await supabase
            .from("meal_food_tags")
            .insert(junctionData)

          if (linkError) console.error("Error linking tags:", linkError)
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
          <Text className="mt-1 text-sm text-slate-500">
            調整名稱、時間與標籤後即可上傳
          </Text>
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
            name="name"
            render={({ field: { onChange, value } }) => (
              <View className="gap-2">
                <Text className="h3">餐點名稱</Text>
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  placeholder="例如：訓練後晚餐"
                  placeholderTextColor="#94a3b8"
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800"
                />
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
