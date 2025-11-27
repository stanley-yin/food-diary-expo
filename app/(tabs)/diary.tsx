import { SafeAreaView } from "react-native-safe-area-context"
import { ScrollView, Text, View } from "react-native"
import { supabase } from "@/lib/supabase.web"
import { useEffect, useState } from "react"
import { Image } from "expo-image"
import { FileObject } from "@supabase/storage-js"

interface StorageFileWithUrl extends FileObject {
  publicUrl: string
}

export default function Diary() {
  const [bucketImage, setBucketImage] = useState<StorageFileWithUrl[] | null>(
    [],
  )
  const getAllImages = async () => {
    const { data } = await supabase.storage.from("avatars").list()
    if (!data) return

    const filesWithUrl: StorageFileWithUrl[] = data.map((file) => {
      const { data: imageData } = supabase.storage.from("my-bucket").getPublicUrl(file.name)
      return {
        ...file,
        publicUrl: imageData.publicUrl,
      }
    })
    setBucketImage(filesWithUrl)
  }

  useEffect(() => {
    getAllImages()
  }, [])

  const content = bucketImage?.map((item, index) => {
    return (
      <View className="w-1/3 p-1 rounded overflow-hidden" key={index}>
        <Image
          source={{ uri: item.publicUrl }}
          style={{
            width: "100%",
            minHeight: 100,
          }}
        />
        <Text>{item.created_at}</Text>
      </View>
    )
  })
  return (
    <SafeAreaView>
      <ScrollView>
        <View className="flex-row flex-wrap">{content}</View>
      </ScrollView>
    </SafeAreaView>
  )
}
