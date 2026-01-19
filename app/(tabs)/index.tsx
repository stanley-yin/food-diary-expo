import { ScrollView, Text, TouchableOpacity, View } from "react-native"
import { useAuthContext } from "@/hooks/use-auth-context"
import * as ImagePicker from "expo-image-picker"
import { useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import Octicons from "@expo/vector-icons/Octicons"
import { supabase } from "@/lib/supabase.web"
import { useEffect, useState } from "react"
import ImageViewer from "@/components/imageViewer"
import dayjs from "dayjs"

type mealItem = {
  created_at: Date,
  datetime: Date,
  id: string,
  img_url: string,
  name: string,
  user_id: string,
}

export default function HomeScreen() {
  const { profile } = useAuthContext()
  const router = useRouter()
  const [meals, setMeals] = useState<mealItem[]>([])

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

  const getData = async () => {
    const start = dayjs().startOf('day').toISOString();
    const end = dayjs().endOf('day').toISOString();

    const { data} = await supabase
      .from("meals")
      .select()
      .gte("datetime", start) // Greater Than or Equal (>=)
      .lte("datetime", end) // Less Than or Equal (<=)

    if(!data){
      return []
    }



    const result:mealItem[] =  []
    for (let i = 0; i < data?.length; i++) {
      const item = data[i]
      const { data: imageData } = await supabase.storage
        .from("avatars")
        .createSignedUrl("1768787914590_IMG_0005.jpeg", 3600)

      const obj = {
        ...item,
        img_url: imageData?.signedUrl,
      }
      result.push(obj)
    }
    setMeals(result)
  }

  useEffect(() => {
    getData()
  }, [])

  return (
    <SafeAreaView className="bg-background h-full px-6 ">
      <Text>Hi {profile?.full_name}</Text>
      {/* 飲食概況 */}
      <Text className="h1">飲食概況</Text>
      {/* 已攝取熱量卡片 */}
      {/* 今日餐點 */}
      <ScrollView>
        {meals.map((meal, index) => (
          <View key={index}>
            <Text>{meal.name}</Text>
            <Text>{meal.datetime.toString()}</Text>
            <ImageViewer imgSource={meal.img_url} selectedImage={meal.img_url}  />
          </View>
        ))}
      </ScrollView>
      <TouchableOpacity
        onPress={onSelectImage}
        className="bg-primary rounded-full items-center justify-center w-16 h-16 !absolute bottom-12 right-10 z-10"
      >
        <Octicons name="diff-added" size={30} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  )
}
