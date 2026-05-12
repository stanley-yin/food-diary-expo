import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect, useMemo, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import ImageViewer from "@/components/imageViewer"
import TagInput from "@/components/TagInput"
import ThemeButton from "@/components/Button"
import SuggestedTags from "@/components/SuggestedTags"
import DateTimePickerField from "@/components/DateTimePickerField"
import { supabase } from "@/lib/supabase.web"
import {
  MEAL_LABEL_MAP,
  MEAL_LABEL_OPTIONS,
  getMealLabelFromDate,
  type MealLabelKey,
} from "@/constants/meal-label"
import { useSuggestedMealTags } from "@/hooks/use-suggested-meal-tags"

type FormValues = {
  label: MealLabelKey
  datetime: Date
}

const parseIsoDate = (rawDate?: string | null) => {
  if (!rawDate) return new Date()
  const parsed = new Date(rawDate)
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

export default function EditMealModalScreen() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [tags, setTags] = useState<string[]>([])
  const mealId = useMemo(
    () =>
      typeof params.mealId === "string"
        ? params.mealId
        : Array.isArray(params.mealId)
          ? params.mealId[0]
          : "",
    [params.mealId],
  )
  const imageUri = useMemo(
    () =>
      typeof params.imgUri === "string"
        ? params.imgUri
        : Array.isArray(params.imgUri)
          ? params.imgUri[0]
          : "",
    [params.imgUri],
  )

  const { control, handleSubmit, reset, watch, setValue } = useForm<FormValues>({
    defaultValues: {
      label: getMealLabelFromDate(new Date()),
      datetime: new Date(),
    },
  })
  const currentLabel = watch("label")
  const currentDatetime = watch("datetime")
  const { suggestions, isLoading: isSuggestionsLoading } = useSuggestedMealTags(
    currentLabel,
    tags,
  )

  useEffect(() => {
    const fetchMeal = async () => {
      if (!mealId) {
        setIsFetching(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from("meals")
          .select(
            `
            id,
            label,
            datetime,
            food_tags (
              name
            )
          `,
          )
          .eq("id", mealId)
          .single()

        if (error) throw error
        if (!data) return

        const initialLabel =
          data.label && data.label in MEAL_LABEL_MAP
            ? (data.label as MealLabelKey)
            : "breakfast"

        reset({
          label: initialLabel,
          datetime: parseIsoDate(data.datetime),
        })
        setTags((data.food_tags || []).map((item) => item.name))
      } catch (error) {
        console.error("Failed to fetch meal:", error)
      } finally {
        setIsFetching(false)
      }
    }

    fetchMeal()
  }, [mealId, reset])

  const handleUpdateMeal = async (formData: FormValues) => {
    if (!mealId || isFetching) return
    setIsLoading(true)

    try {
      const normalizedTags = [...new Set(tags.map((tag) => tag.trim()))].filter(
        Boolean,
      )

      const { error: mealError } = await supabase
        .from("meals")
        .update({
          label: formData.label,
          datetime: formData.datetime.toISOString(),
        })
        .eq("id", mealId)

      if (mealError) throw mealError

      const { error: deleteLinkError } = await supabase
        .from("meal_food_tags")
        .delete()
        .eq("meal_id", mealId)

      if (deleteLinkError) throw deleteLinkError

      if (normalizedTags.length > 0) {
        const { data: existingTags, error: existingTagsError } = await supabase
          .from("food_tags")
          .select("id, name")
          .in("name", normalizedTags)

        if (existingTagsError) throw existingTagsError

        const existingTagMap = new Map(
          (existingTags || []).map((item) => [item.name, item.id]),
        )
        const missingTagNames = normalizedTags.filter(
          (name) => !existingTagMap.has(name),
        )

        if (missingTagNames.length > 0) {
          const { data: insertedTags, error: insertTagsError } = await supabase
            .from("food_tags")
            .insert(missingTagNames.map((name) => ({ name })))
            .select("id, name")

          if (insertTagsError) throw insertTagsError

          for (const item of insertedTags || []) {
            existingTagMap.set(item.name, item.id)
          }
        }

        const tagIds = normalizedTags
          .map((name) => existingTagMap.get(name))
          .filter((id): id is string => Boolean(id))

        if (tagIds.length > 0) {
          const { error: insertLinkError } = await supabase
            .from("meal_food_tags")
            .insert(tagIds.map((tagId) => ({ meal_id: mealId, tag_id: tagId })))

          if (insertLinkError) throw insertLinkError
        }
      }

      router.back()
    } catch (error) {
      console.error("Failed to update meal:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteMeal = async () => {
    if (!mealId || isFetching) return
    setIsLoading(true)

    try {
      const { error: deleteLinkError } = await supabase
        .from("meal_food_tags")
        .delete()
        .eq("meal_id", mealId)

      if (deleteLinkError) throw deleteLinkError

      const { error: deleteMealError } = await supabase
        .from("meals")
        .delete()
        .eq("id", mealId)

      if (deleteMealError) throw deleteMealError

      router.back()
    } catch (error) {
      console.error("Failed to delete meal:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const confirmDeleteMeal = () => {
    if (!mealId || isFetching || isLoading) return

    Alert.alert("刪除餐點", "刪除後將無法復原，確定要刪除嗎？", [
      { text: "取消", style: "cancel" },
      {
        text: "刪除",
        style: "destructive",
        onPress: () => {
          void handleDeleteMeal()
        },
      },
    ])
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-slate-50"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerClassName="mx-auto w-full max-w-xl px-4 pb-10 pt-8"
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-6">
          <Text className="text-2xl font-bold text-slate-900">編輯餐點</Text>
          <Text className="mt-1 text-sm text-slate-500">
            調整時間與標籤後按下儲存更新
          </Text>
        </View>

        {!!imageUri && (
          <View className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
            <ImageViewer
              imgSource={imageUri}
              selectedImage={imageUri}
              className="h-72 w-full"
            />
          </View>
        )}

        <View className="mt-5 gap-5 rounded-3xl border border-slate-200 bg-white p-5">
          {isFetching ? (
            <Text className="text-slate-500">資料讀取中...</Text>
          ) : (
            <>
              <DateTimePickerField
                value={currentDatetime}
                onChange={(date) => setValue("datetime", date)}
              />

              <Controller
                control={control}
                name="label"
                render={({ field: { onChange, value } }) => (
                  <View className="gap-2">
                    <Text className="h3">餐別</Text>
                    <View className="flex-row flex-wrap gap-2">
                      {MEAL_LABEL_OPTIONS.map((option) => {
                        const isActive = value === option.value
                        return (
                          <Pressable
                            key={option.value}
                            onPress={() => onChange(option.value)}
                            className={`rounded-full border px-4 py-2 ${
                              isActive
                                ? "border-blue-600 bg-blue-600"
                                : "border-slate-200 bg-slate-50"
                            }`}
                          >
                            <Text
                              className={`text-sm font-semibold ${
                                isActive ? "text-white" : "text-slate-600"
                              }`}
                            >
                              {option.label}
                            </Text>
                          </Pressable>
                        )
                      })}
                    </View>
                    <Text className="text-xs text-slate-400">
                      目前選擇：{MEAL_LABEL_MAP[value]}
                    </Text>
                  </View>
                )}
              />

              <SuggestedTags
                suggestions={suggestions}
                selectedTags={tags}
                isLoading={isSuggestionsLoading}
                onSelectTag={(tag) => {
                  if (tags.includes(tag)) return
                  setTags([...tags, tag])
                }}
              />

              <TagInput tags={tags} setTags={setTags} label="食物標籤" />
            </>
          )}
        </View>

        <View className="mt-8 flex-row gap-3">
          <ThemeButton
            size={"md"}
            variant={"ghost"}
            title="取消"
            className="flex-1 border border-slate-200 bg-white"
            disabled={isLoading}
            onPress={() => router.back()}
          />
          <ThemeButton
            size={"md"}
            title={
              isFetching ? "資料讀取中..." : isLoading ? "儲存中..." : "儲存變更"
            }
            className={`flex-1 ${isFetching ? "bg-slate-400" : ""}`}
            disabled={isLoading}
            onPress={handleSubmit(handleUpdateMeal)}
          />
        </View>

        <ThemeButton
          size={"md"}
          variant={"ghost"}
          title={isLoading ? "處理中..." : "刪除餐點"}
          className="mt-3 border border-red-200 bg-red-50"
          disabled={isLoading || isFetching}
          onPress={confirmDeleteMeal}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
