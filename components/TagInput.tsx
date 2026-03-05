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
  placeholder = "例如：雞胸肉、燕麥、沙拉",
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
    <View className="gap-3">
      <Text className="h3">{label}</Text>
      <View className="flex-row items-center gap-2">
        <TextInput
          value={currentTag}
          onChangeText={setCurrentTag}
          onSubmitEditing={handleAddTag}
          placeholder={placeholder}
          placeholderTextColor="#94a3b8"
          className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800"
          returnKeyType="done"
        />
        <Pressable
          onPress={handleAddTag}
          className="rounded-xl bg-blue-600 px-4 py-3"
        >
          <Text className="font-semibold text-white">新增</Text>
        </Pressable>
      </View>
      <View className="min-h-8 flex-row flex-wrap gap-2 items-center">
        {tags.map((tag, index) => (
          <View
            key={index}
            className="flex-row items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5"
          >
            <Text className="font-medium text-blue-700">{tag}</Text>
            <Pressable
              onPress={() => handleRemoveTag(index)}
              className="items-center justify-center rounded-full bg-blue-100 px-1.5"
            >
              <Text className="font-bold text-blue-700">×</Text>
            </Pressable>
          </View>
        ))}
        {tags.length === 0 && (
          <Text className="text-sm text-slate-400">尚未新增標籤</Text>
        )}
      </View>
    </View>
  )
}
