import { Image } from "expo-image"
import { StyleSheet, TouchableOpacity } from "react-native"
import { HelloWave } from "@/components/hello-wave"
import ParallaxScrollView from "@/components/parallax-scroll-view"
import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { useAuthContext } from "@/hooks/use-auth-context"
import * as ImagePicker from "expo-image-picker"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"

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
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#A1CEDC", dark: "#1D3D47" }}
      headerImage={
        <Image
          source={require("@/assets/images/partial-react-logo.png")}
          style={styles.reactLogo}
        />
      }
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Welcome!{profile?.full_name}</ThemedText>
        <HelloWave />
      </ThemedView>
      <TouchableOpacity onPress={onSelectImage}>
        <Ionicons name="camera-outline" size={30} color={"#fff"} />
        <ThemedText type="title">選擇圖片</ThemedText>
      </TouchableOpacity>
    </ParallaxScrollView>
  )
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: "absolute",
  },
  imageContainer: {
    flex: 1,
  },
  image: {
    width: 320,
    height: 440,
    borderRadius: 18,
  },
})
