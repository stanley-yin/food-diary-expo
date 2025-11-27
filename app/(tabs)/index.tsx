import { Text, TouchableOpacity } from "react-native"
import { useAuthContext } from "@/hooks/use-auth-context"
import * as ImagePicker from "expo-image-picker"
import { useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import Octicons from "@expo/vector-icons/Octicons"

export default function HomeScreen() {
  const { profile } = useAuthContext()
  const router = useRouter()
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

  return (
    <SafeAreaView className="bg-background h-full px-6">
      <Text>Hi {profile?.full_name}</Text>
      {/* 飲食概況 */}
      <Text className="h1">飲食概況</Text>
      {/* 已攝取熱量卡片 */}
      {/* 今日餐點 */}

      <TouchableOpacity
        onPress={onSelectImage}
        className="bg-primary rounded-full items-center justify-center w-16 h-16 !absolute bottom-12 right-10 z-10"
      >
        <Octicons name="diff-added" size={30} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  )
}
