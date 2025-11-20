import { Image } from "expo-image"
import { StyleSheet, TouchableOpacity, View } from "react-native"
import { HelloWave } from "@/components/hello-wave"
import ParallaxScrollView from "@/components/parallax-scroll-view"
import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import SignOutButton from "@/components/social-auth-buttons/sign-out-button"
import { useAuthContext } from "@/hooks/use-auth-context"
import { supabase } from "@/lib/supabase.web"
import * as ImagePicker from "expo-image-picker"
import { Ionicons } from "@expo/vector-icons"
import { useState } from "react"
import ImageViewer from "@/components/imageViewer"
import Button from "@/components/Button"
import { decode } from "base64-arraybuffer"
import * as FileSystem from "expo-file-system/legacy"

export default function HomeScreen() {
  const { profile } = useAuthContext()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | undefined>(
    undefined
  )
  const onSelectImage = async () => {
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      exif: true // 讀取圖片細節 metadata
    }

    const result = await ImagePicker.launchImageLibraryAsync(options)
    if (!result.canceled) {
      setSelectedImage(result?.assets[0])
    }
  }

  const uploadImage = async () => {
    if (selectedImage === undefined) return
    setIsLoading(true)

    // 要注意 react-native 上傳圖片到 supabase 需要用 base64, arrayBuffer 的方式才可以，不能使用 Blob
    const b64 = await FileSystem.readAsStringAsync(selectedImage.uri, { encoding: FileSystem.EncodingType.Base64 })
    const arrayBuffer = await decode(b64)

    // todo: 這邊需要再考慮未來要如何讀取使用者圖片，路徑要再想一下
    const filePath = `${Date.now()}_${selectedImage.fileName ?? "upload.jpg"}`
    const { data, error } = await supabase.storage
      .from("avatars")
      .upload(filePath, arrayBuffer, {
        contentType: selectedImage.mimeType,
        upsert: true             // 如果要覆蓋原檔就打開
      })


    if (error) {
      console.error("Upload error:", error)
    } else {
      setIsLoading(false)
      console.log("upload success:", data)
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
        <ThemedText type="title">Welcome!</ThemedText>
        <HelloWave />
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Username</ThemedText>
        <ThemedText>{profile?.username}</ThemedText>
        <ThemedText type="subtitle">Full name</ThemedText>
        <ThemedText>{profile?.full_name}</ThemedText>
      </ThemedView>
      <TouchableOpacity onPress={onSelectImage} style={styles.fab}>
        <Ionicons name="camera-outline" size={30} color={"#fff"} />
        <ThemedText type="title">選擇圖片</ThemedText>
      </TouchableOpacity>
      {selectedImage && (
        <>
          <View style={styles.imageContainer}>
            <ImageViewer
              selectedImage={selectedImage?.uri}
            />
            <ThemedText type="title">照片日期：{selectedImage.exif.DateTimeOriginal}</ThemedText>
          </View>
          <Button
            onPress={uploadImage}
            label={isLoading ? "上傳中" : "上傳圖片"}
          />
        </>
      )}
      <SignOutButton />
    </ParallaxScrollView>
  )
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: "absolute"
  },
  imageContainer: {
    flex: 1
  },
  image: {
    width: 320,
    height: 440,
    borderRadius: 18
  }
})
