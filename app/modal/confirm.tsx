import { Button, Text, TextInput, View } from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import ImageViewer from "@/components/imageViewer"
import * as FileSystem from "expo-file-system/legacy"
import { decode } from "base64-arraybuffer"
import { supabase } from "@/lib/supabase.web"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import DateTimePicker from "@react-native-community/datetimepicker"

export default function ConfirmModalScreen() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const { imgUri, date, mimeType, fileName } = Array.isArray(params) ? params[0] : params

  const [showPicker, setShowPicker] = useState(false)
  const {
    control,
    handleSubmit,
  } = useForm({
    defaultValues: {
      name:'',
      datetime: new Date(date.replace(/:/, '-').replace(/:/, '-')), // EXIF 不是標準 ISO 格式
    }
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

      const { error: mealError } = await supabase.from("meals").insert({
        datetime: data.datetime.toISOString(),
        name: data.name,
        user_id: user?.id,
        img_url: storageData.path, // 使用上傳成功的路徑
      })

      if (mealError) throw mealError

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
    <View className="mx-auto py-10">
      <View>
        <ImageViewer imgSource={imgUri} selectedImage={imgUri} />
        <Text>照片日期：{date}</Text>
        <View>
          <Controller
            control={control}
            name="name"
            rules={{ required: "name is required" }}
            render={({ field: { onChange, value } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                placeholder="food name"
                className="border p-2 mb-4"
              />
            )}
          />
          <Controller
            control={control}
            name="datetime"
            render={({ field: { onChange, value } }) => (
              <>
                <Button title="Pick Date" onPress={() => setShowPicker(true)} />
                {showPicker && (
                  <DateTimePicker
                    value={value}
                    mode="datetime"
                    display="default"
                    onChange={(event, selectedDate) => {
                      if (selectedDate) onChange(selectedDate) // 更新 RHF value
                    }}
                  />
                )}
                <Text>Selected: {value?.toLocaleString()}</Text>
              </>
            )}
          />
        </View>
        <View className="flex flex-row justify-between">
          <Button
            title="重新選擇"
            disabled={isLoading}
            onPress={() => router.back()}
          />
          <Button
            title="確認使用"
            onPress={handleSubmit(uploadImage)}
            disabled={isLoading}
          />
        </View>
      </View>
    </View>
  )
}
