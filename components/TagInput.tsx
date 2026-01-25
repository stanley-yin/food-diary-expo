import { useState } from "react"
import { View, Text, TextInput, Pressable } from "react-native"

interface TagInputProps {
  tags: string[]
  setTags: (tags: string[]) => void
  label?: string
  placeholder?: string
}

export default function TagInput({
  tags,
  setTags,
  label = "標籤：",
  placeholder = "輸入標籤後按 Enter 新增",
}: TagInputProps) {
  const [currentTag, setCurrentTag] = useState<string>("")

  const handleAddTag = () => {
    const newTag = currentTag.trim()
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag])
    }
    setCurrentTag("") // Clear input after adding
  }

  const handleRemoveTag = (indexToRemove: number) => {
    setTags(tags.filter((_, index) => index !== indexToRemove))
  }

  return (
    <View className="py-4 gap-2">
      <Text className="h3">{label}</Text>
      <View className="flex-row flex-wrap gap-2 items-center">
        {tags.map((tag, index) => (
          <View
            key={index}
            className="bg-sky-500 rounded-full px-3 py-1 flex-row items-center gap-2"
          >
            <Text className="text-white">{tag}</Text>
            <Pressable onPress={() => handleRemoveTag(index)}>
              <Text className="text-white font-bold text-lg">×</Text>
            </Pressable>
          </View>
        ))}
      </View>
      <TextInput
        value={currentTag}
        onChangeText={setCurrentTag}
        onSubmitEditing={handleAddTag}
        placeholder={placeholder}
        className="border-b border-gray-400 mt-2"
      />
    </View>
  )
}
