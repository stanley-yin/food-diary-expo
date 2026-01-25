import { Text, TextInput, View } from "react-native"
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
      datetime: new Date(date.replace(/:/, "-").replace(/:/, "-")), // EXIF 不是標準 ISO 格式
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
    <View className="mx-auto py-10 w-full px-4">
      <View>
        <ImageViewer imgSource={imgUri} selectedImage={imgUri} />
        <View>
          <TagInput tags={tags} setTags={setTags} label="食物標籤：" />
          <Controller
            control={control}
            name="datetime"
            render={({ field: { onChange, value } }) => (
              <View className="flex-row items-center py-4">
                <Text className="h3">用餐時間：</Text>
                <DateTimePicker
                  value={value}
                  mode="datetime"
                  display="default"
                  onChange={(event, selectedDate) => {
                    if (selectedDate) onChange(selectedDate) // 更新 RHF value
                  }}
                />
              </View>
            )}
          />
        </View>
        <View className="flex mt-10 flex-row justify-between">
          <ThemeButton
            size={"lg"}
            variant={"ghost"}
            title="重新選擇"
            disabled={isLoading}
            onPress={() => router.back()}
          />
          <ThemeButton
            size={"lg"}
            title="上傳"
            disabled={isLoading}
            onPress={handleSubmit(uploadImage)}
          />
        </View>
      </View>
    </View>
  )
}
