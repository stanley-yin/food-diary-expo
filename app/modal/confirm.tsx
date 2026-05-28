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
import ImageViewer from "@/components/imageViewer"
import * as FileSystem from "expo-file-system/legacy"
import { decode } from "base64-arraybuffer"
import { supabase } from "@/lib/supabase.web"
import { useEffect, useMemo, useState } from "react"
import ThemeButton from "@/components/Button"
import DateTimePickerField from "@/components/DateTimePickerField"
import TagInput from "@/components/TagInput"
import SuggestedTags from "@/components/SuggestedTags"
import {
  MEAL_LABEL_BADGE_STYLES,
  MEAL_LABEL_MAP,
  MEAL_LABEL_OPTIONS,
  getMealLabelFromDate,
  type MealLabelKey,
} from "@/constants/meal-label"
import { useSuggestedMealTags } from "@/hooks/use-suggested-meal-tags"

const parseExifDate = (rawDate?: string | string[]) => {
  const normalized = Array.isArray(rawDate) ? rawDate[0] : rawDate
  if (!normalized) return new Date()
  const parsed = new Date(normalized.replace(/:/, "-").replace(/:/, "-"))
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

type MealDraftParam = {
  uri?: string
  date?: string
  fileName?: string | null
  mimeType?: string | null
}

type MealDraft = {
  id: string
  imgUri: string
  fileName?: string | null
  mimeType?: string | null
  datetime: Date
  label: MealLabelKey
  tags: string[]
  status: "idle" | "uploading" | "success" | "error"
  errorMessage?: string
}

type MealDraftCardProps = {
  draft: MealDraft
  index: number
  isExpanded: boolean
  isSubmitting: boolean
  onToggle: () => void
  onUpdate: (updater: (draft: MealDraft) => MealDraft) => void
  onRemove: () => void
}

function MealDraftCard({
  draft,
  index,
  isExpanded,
  isSubmitting,
  onToggle,
  onUpdate,
  onRemove,
}: MealDraftCardProps) {
  const isSuccess = draft.status === "success"
  const isUploading = draft.status === "uploading"
  const { suggestions, isLoading } = useSuggestedMealTags(draft.label, draft.tags)

  return (
    <View className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
      <Pressable onPress={onToggle} className="px-4 pb-4 pt-4">
        <View className="flex-row items-start gap-3">
          <ImageViewer
            imgSource={draft.imgUri}
            selectedImage={draft.imgUri}
            className="h-20 w-20 overflow-hidden rounded-2xl"
          />
          <View className="flex-1 gap-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-semibold text-slate-900">
                第 {index + 1} 筆餐點
              </Text>
              <View className="flex-row items-center gap-2">
                {isSuccess && (
                  <View className="rounded-full bg-emerald-100 px-3 py-1">
                    <Text className="text-xs font-semibold text-emerald-700">
                      已完成
                    </Text>
                  </View>
                )}
                {draft.status === "error" && (
                  <View className="rounded-full bg-red-100 px-3 py-1">
                    <Text className="text-xs font-semibold text-red-700">失敗</Text>
                  </View>
                )}
                {isUploading && (
                  <View className="rounded-full bg-blue-100 px-3 py-1">
                    <Text className="text-xs font-semibold text-blue-700">
                      上傳中
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <View
              className="self-start rounded-full px-3 py-1"
              style={{
                backgroundColor: MEAL_LABEL_BADGE_STYLES[draft.label].backgroundColor,
              }}
            >
              <Text
                className="text-xs font-semibold"
                style={{ color: MEAL_LABEL_BADGE_STYLES[draft.label].textColor }}
              >
                {MEAL_LABEL_MAP[draft.label]}
              </Text>
            </View>
            <Text className="text-sm text-slate-400">
              {draft.datetime.toLocaleString()}
            </Text>
            {draft.errorMessage ? (
              <Text className="text-sm text-red-500">{draft.errorMessage}</Text>
            ) : null}
          </View>
        </View>
      </Pressable>

      {isExpanded && (
        <View className="gap-5 border-t border-slate-100 px-4 py-5">
          <DateTimePickerField
            value={draft.datetime}
            onChange={(date) =>
              onUpdate((current) => ({
                ...current,
                datetime: date,
                status: current.status === "error" ? "idle" : current.status,
                errorMessage: undefined,
              }))
            }
          />

          <View className="gap-2">
            <Text className="h3">餐別</Text>
            <View className="flex-row flex-wrap gap-2">
              {MEAL_LABEL_OPTIONS.map((option) => {
                const isActive = draft.label === option.value
                return (
                  <Pressable
                    key={option.value}
                    onPress={() =>
                      onUpdate((current) => ({
                        ...current,
                        label: option.value,
                        status: current.status === "error" ? "idle" : current.status,
                        errorMessage: undefined,
                      }))
                    }
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
          </View>

          <SuggestedTags
            suggestions={suggestions}
            selectedTags={draft.tags}
            isLoading={isLoading}
            onSelectTag={(tag) => {
              if (draft.tags.includes(tag)) return
              onUpdate((current) => ({
                ...current,
                tags: [...current.tags, tag],
                status: current.status === "error" ? "idle" : current.status,
                errorMessage: undefined,
              }))
            }}
          />

          <TagInput
            tags={draft.tags}
            setTags={(nextTags) =>
              onUpdate((current) => ({
                ...current,
                tags: nextTags,
                status: current.status === "error" ? "idle" : current.status,
                errorMessage: undefined,
              }))
            }
            label="食物標籤"
          />

          {!isSuccess && (
            <ThemeButton
              size={"md"}
              variant={"ghost"}
              title="移除這張照片"
              className="border border-red-200 bg-red-50"
              disabled={isSubmitting}
              onPress={onRemove}
            />
          )}
        </View>
      )}
    </View>
  )
}

export default function ConfirmModalScreen() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const [drafts, setDrafts] = useState<MealDraft[]>([])
  const [expandedDraftId, setExpandedDraftId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const draftParams = useMemo(() => {
    const rawDrafts = params.drafts
    const value = Array.isArray(rawDrafts) ? rawDrafts[0] : rawDrafts

    if (!value) return []

    try {
      const parsed = JSON.parse(value) as MealDraftParam[]
      return Array.isArray(parsed) ? parsed : []
    } catch (error) {
      console.error("Failed to parse meal drafts:", error)
      return []
    }
  }, [params.drafts])

  useEffect(() => {
    const nextDrafts = draftParams
      .filter((item) => !!item.uri)
      .map((item, index) => {
        const datetime = parseExifDate(item.date)
        return {
          id: `${Date.now()}-${index}`,
          imgUri: item.uri || "",
          fileName: item.fileName,
          mimeType: item.mimeType,
          datetime,
          label: getMealLabelFromDate(datetime),
          tags: [],
          status: "idle" as const,
        }
      })

    setDrafts(nextDrafts)
    setExpandedDraftId(nextDrafts[0]?.id ?? null)
  }, [draftParams])

  const pendingCount = drafts.filter((draft) => draft.status !== "success").length

  const updateDraft = (
    draftId: string,
    updater: (draft: MealDraft) => MealDraft,
  ) => {
    setDrafts((current) =>
      current.map((draft) => (draft.id === draftId ? updater(draft) : draft)),
    )
  }

  const removeDraft = (draftId: string) => {
    setDrafts((current) => {
      const nextDrafts = current.filter((draft) => draft.id !== draftId)
      if (expandedDraftId === draftId) {
        setExpandedDraftId(nextDrafts[0]?.id ?? null)
      }
      return nextDrafts
    })
  }

  const upsertTags = async (tagNames: string[]) => {
    const normalizedTagNames = [...new Set(tagNames.map((tag) => tag.trim()))].filter(
      Boolean,
    )
    if (normalizedTagNames.length === 0) return []

    const { data: existingTags, error: existingTagsError } = await supabase
      .from("food_tags")
      .select("id, name")
      .in("name", normalizedTagNames)

    if (existingTagsError) throw existingTagsError

    const existingTagMap = new Map(
      (existingTags || []).map((item) => [item.name, item.id]),
    )
    const missingTagNames = normalizedTagNames.filter(
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

    return normalizedTagNames
      .map((name) => existingTagMap.get(name))
      .filter((id): id is string => Boolean(id))
  }

  const uploadDraft = async (draft: MealDraft, userId?: string) => {
    const b64 = await FileSystem.readAsStringAsync(draft.imgUri, {
      encoding: FileSystem.EncodingType.Base64,
    })
    const arrayBuffer = decode(b64)
    const filePath = `${Date.now()}_${draft.fileName ?? "upload.jpg"}`

    const { data: storageData, error: storageError } = await supabase.storage
      .from("avatars")
      .upload(filePath, arrayBuffer, {
        contentType: draft.mimeType || "image/jpeg",
        upsert: true,
      })

    if (storageError) throw storageError

    const { data: meal, error: mealError } = await supabase
      .from("meals")
      .insert({
        datetime: draft.datetime.toISOString(),
        label: draft.label,
        user_id: userId,
        img_url: storageData.path,
      })
      .select("id")
      .single()

    if (mealError) throw mealError

    const tagIds = await upsertTags(draft.tags)
    if (tagIds.length === 0) return

    const { error: linkError } = await supabase
      .from("meal_food_tags")
      .insert(tagIds.map((tagId) => ({ meal_id: meal.id, tag_id: tagId })))

    if (linkError) throw linkError
  }

  const handleSubmitAll = async () => {
    const draftsToUpload = drafts.filter((draft) => draft.status !== "success")
    if (draftsToUpload.length === 0) return

    setIsSubmitting(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      let failedCount = 0

      for (const draft of draftsToUpload) {
        updateDraft(draft.id, (current) => ({
          ...current,
          status: "uploading",
          errorMessage: undefined,
        }))

        try {
          await uploadDraft(draft, user?.id)
          updateDraft(draft.id, (current) => ({
            ...current,
            status: "success",
            errorMessage: undefined,
          }))
        } catch (error) {
          failedCount += 1
          console.error("Failed to upload meal draft:", error)
          updateDraft(draft.id, (current) => ({
            ...current,
            status: "error",
            errorMessage: "上傳失敗，請再試一次",
          }))
        }
      }

      if (failedCount === 0) {
        router.back()
        return
      }

      Alert.alert("部分餐點未新增", "失敗的照片已保留在頁面上，可直接再次送出。")
    } finally {
      setIsSubmitting(false)
    }
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
          <Text className="text-2xl font-bold text-slate-900">確認餐點內容</Text>
          <Text className="mt-1 text-sm text-slate-500">
            已選擇 {drafts.length} 張照片，每張照片會建立一筆餐點
          </Text>
        </View>

        <View className="gap-4">
          {drafts.map((draft, index) => (
            <MealDraftCard
              key={draft.id}
              draft={draft}
              index={index}
              isExpanded={expandedDraftId === draft.id}
              isSubmitting={isSubmitting}
              onToggle={() =>
                setExpandedDraftId((current) =>
                  current === draft.id ? null : draft.id,
                )
              }
              onUpdate={(updater) => updateDraft(draft.id, updater)}
              onRemove={() => removeDraft(draft.id)}
            />
          ))}
        </View>

        <View className="mt-8 flex-row gap-3">
          <ThemeButton
            size={"md"}
            variant={"ghost"}
            title="取消"
            className="flex-1 border border-slate-200 bg-white"
            disabled={isSubmitting}
            onPress={() => router.back()}
          />
          <ThemeButton
            size={"md"}
            title={isSubmitting ? "新增中..." : `新增 ${pendingCount} 筆餐點`}
            className={`flex-1 ${pendingCount === 0 ? "bg-slate-400" : ""}`}
            disabled={isSubmitting || pendingCount === 0}
            onPress={handleSubmitAll}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
