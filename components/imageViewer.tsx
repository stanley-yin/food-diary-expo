import {  StyleSheet, View } from "react-native"
import { Image } from "expo-image"

type Props = {
  imgSource: string
  selectedImage?: string
  className?: string
}

export default function ImageViewer({
  imgSource,
  selectedImage,
  className = "w-40 h-40 rounded",
}: Props) {
  const imageSource = selectedImage ? { uri: selectedImage } : imgSource

  return (
    <View className={className}>
      <Image source={imageSource} style={styles.image} />
    </View>
  )
}

const styles = StyleSheet.create({
  image: {
    width: "100%",
    height: "100%",
  },
})
