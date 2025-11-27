import { View, Text, Button } from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import ImageViewer from "@/components/imageViewer"
import * as FileSystem from "expo-file-system/legacy"
import { decode } from "base64-arraybuffer"
import { supabase } from "@/lib/supabase.web"
import { useState } from "react"

export default function ConfirmModalScreen() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const { imgUri, date, mimeType, fileName } = params

  const uploadImage = async () => {
    if (imgUri === undefined) return
    setIsLoading(true)

    try {
      // 要注意 react-native 上傳圖片到 supabase 需要用 base64, arrayBuffer 的方式才可以，不能使用 Blob
      const b64 = await FileSystem.readAsStringAsync(imgUri, {
        encoding: FileSystem.EncodingType.Base64,
      })
      const arrayBuffer = await decode(b64)

      // todo: 這邊需要再考慮未來要如何讀取使用者圖片，路徑要再想一下
      const filePath = `${Date.now()}_${fileName ?? "upload.jpg"}`
      const { data, error } = await supabase.storage
        .from("avatars")
        .upload(filePath, arrayBuffer, {
          contentType: mimeType,
          upsert: true, // 如果要覆蓋原檔就打開
        })

      if (error) {
        console.error("Upload error:", error)
      } else {
        console.log("upload success: ", data)
        router.back()
      }
      setIsLoading(false)
    } catch (e) {
      console.error(e)
      setIsLoading(false)
    }
  }

  return (
    <View className="mx-auto py-10">
      <View>
        <ImageViewer imgSource={imgUri} selectedImage={imgUri} />
        <Text>照片日期：{date}</Text>
        <View className="flex flex-row justify-between">
          <Button
            title="重新選擇"
            disabled={isLoading}
            onPress={() => router.back()}
          />
          <Button title="確認使用" onPress={uploadImage} disabled={isLoading} />
        </View>
      </View>
    </View>
  )
}
