import { Pressable, Text, View } from "react-native"

type SuggestedTagsProps = {
  suggestions: string[]
  selectedTags: string[]
  onSelectTag: (tag: string) => void
  isLoading?: boolean
}

export default function SuggestedTags({
  suggestions,
  selectedTags,
  onSelectTag,
  isLoading = false,
}: SuggestedTagsProps) {
  if (isLoading) {
    return <Text className="text-sm text-slate-400">正在整理常用標籤...</Text>
  }

  if (suggestions.length === 0) {
    return <Text className="text-sm text-slate-400">目前還沒有可用的標籤建議</Text>
  }

  return (
    <View className="gap-3">
      <Text className="text-sm font-semibold text-slate-600">常用建議</Text>
      <View className="flex-row flex-wrap gap-2">
        {suggestions.map((tag) => {
          const isSelected = selectedTags.includes(tag)
          return (
            <Pressable
              key={tag}
              onPress={() => onSelectTag(tag)}
              disabled={isSelected}
              className={`rounded-full border px-3 py-1.5 ${
                isSelected
                  ? "border-blue-600 bg-blue-600"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  isSelected ? "text-white" : "text-slate-700"
                }`}
              >
                {tag}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}
