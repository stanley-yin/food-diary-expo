import { CameraType, CameraView, useCameraPermissions } from "expo-camera"
import { Image } from "expo-image"
import * as ImagePicker from "expo-image-picker"
import { useRef, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import Feather from "@expo/vector-icons/Feather"
import FontAwesome6 from "@expo/vector-icons/FontAwesome6"

export default function CameraScreen() {
  const router = useRouter()
  const [permission, requestPermission] = useCameraPermissions()
  const [facing, setFacing] = useState<CameraType>("back")
  const [capturedUri, setCapturedUri] = useState<string | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const cameraRef = useRef<CameraView>(null)

  if (!permission) return null

  if (!permission.granted) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-black px-8">
        <Feather name="camera-off" size={48} color="white" />
        <Text className="mt-4 text-center text-base text-white">
          需要相機權限才能拍照
        </Text>
        <Pressable
          onPress={requestPermission}
          className="mt-6 rounded-full bg-blue-600 px-8 py-3"
        >
          <Text className="font-semibold text-white">授予相機權限</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} className="mt-4">
          <Text className="text-slate-400">取消</Text>
        </Pressable>
      </SafeAreaView>
    )
  }

  const handleCapture = async () => {
    if (isCapturing || !cameraRef.current) return
    setIsCapturing(true)
    try {
      const photo = await cameraRef.current.takePictureAsync()
      if (photo?.uri) setCapturedUri(photo.uri)
    } finally {
      setIsCapturing(false)
    }
  }

  const handleSelectFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      exif: true,
      allowsMultipleSelection: true,
      selectionLimit: 0,
    })
    if (!result.canceled) {
      const draftPayload = result.assets.map((asset) => ({
        uri: asset.uri,
        date: asset.exif?.DateTimeOriginal,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
      }))
      router.replace({
        pathname: "/modal/confirm",
        params: { drafts: JSON.stringify(draftPayload) },
      })
    }
  }

  const handleRetake = () => {
    setCapturedUri(null)
  }

  const handleUsePhoto = () => {
    if (!capturedUri) return
    const draftPayload = [
      {
        uri: capturedUri,
        date: undefined,
        fileName: `photo_${Date.now()}.jpg`,
        mimeType: "image/jpeg",
      },
    ]
    router.replace({
      pathname: "/modal/confirm",
      params: { drafts: JSON.stringify(draftPayload) },
    })
  }

  if (capturedUri) {
    return (
      <SafeAreaView className="flex-1 bg-black" edges={["top", "bottom"]}>
        <View className="flex-1 overflow-hidden rounded-[20px]">
          <Image
            source={{ uri: capturedUri }}
            contentFit="contain"
            style={StyleSheet.absoluteFillObject}
          />
          <Pressable
            onPress={() => router.back()}
            className="absolute left-4 top-4 h-11 w-11 items-center justify-center rounded-full bg-black/40"
          >
            <Feather name="x" size={20} color="white" />
          </Pressable>
        </View>

        <View className="flex-row gap-3 px-[30px] pb-4 pt-5">
          <Pressable
            onPress={handleRetake}
            className="flex-1 items-center justify-center rounded-full border border-white/50 bg-black/30 py-4"
          >
            <Text className="text-base font-semibold text-white">重拍</Text>
          </Pressable>
          <Pressable
            onPress={handleUsePhoto}
            className="flex-1 items-center justify-center rounded-full bg-blue-600 py-4"
          >
            <Text className="text-base font-semibold text-white">
              使用此照片
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-black pt-12" edges={["top", "bottom"]}>
      <View className="flex-1 overflow-hidden rounded-[20px]">
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFillObject}
          facing={facing}
        />
        <Pressable
          onPress={() => router.back()}
          className="absolute left-4 top-4 h-20 w-20 items-center justify-center rounded-full"
        >
          <Feather name="x" size={28} color="white" />
        </Pressable>
      </View>

      <View className="flex-row items-center justify-between px-[30px] pb-4 pt-5">
        <Pressable
          className="h-11 w-11 items-center justify-center rounded-full bg-black/40"
          onPress={handleSelectFromLibrary}
        >
          <Feather name="image" size={22} color="white" />
        </Pressable>
        <Pressable
          onPress={handleCapture}
          disabled={isCapturing}
          className={`h-[84px] w-[84px] items-center justify-center rounded-full border-[5px] border-white ${isCapturing ? "opacity-50" : ""}`}
        >
          <View className="h-[68px] w-[68px] rounded-full bg-white" />
        </Pressable>
        <Pressable
          onPress={() => setFacing((f) => (f === "back" ? "front" : "back"))}
          className="h-11 w-11 items-center justify-center rounded-full bg-black/40"
        >
          <FontAwesome6 name="rotate-left" size={22} color="white" />
        </Pressable>
      </View>
    </SafeAreaView>
  )
}
