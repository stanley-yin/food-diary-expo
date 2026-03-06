import { SafeAreaView } from "react-native-safe-area-context"
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native"
import { supabase } from "@/lib/supabase.web"
import { useCallback, useRef, useState } from "react"
import { Image } from "expo-image"
import { useFocusEffect } from "@react-navigation/native"
import dayjs from "dayjs"
import { useRouter } from "expo-router"
import ImageViewer from "@/components/imageViewer"
import {
  MEAL_LABEL_BADGE_STYLES,
  MEAL_LABEL_MAP,
  type MealLabelKey,
} from "@/constants/meal-label"

const PAGE_SIZE = 10
const SIGNED_URL_EXPIRES_IN = 60 * 60 * 24
const REFRESH_INTERVAL_MS = 30 * 1000

type DiaryImageItem = {
  id: string
  imagePath: string
  signedUrl: string
  label?: MealLabelKey | null
  datetime: string | null
  createdAt: string | null
  foodTags: { id: string; name: string }[]
}

type MealRow = {
  id: string
  img_url: string
  label?: MealLabelKey | null
  datetime: string | null
  created_at: string | null
  food_tags: { id: string; name: string }[]
}

type ViewMode = "grid" | "detail"

const mergeUniqueDiaryItems = (
  currentItems: DiaryImageItem[],
  incomingItems: DiaryImageItem[],
) => {
  const itemMap = new Map(currentItems.map((item) => [item.id, item]))

  for (const item of incomingItems) {
    itemMap.set(item.id, item)
  }

  return [...itemMap.values()]
}

export default function Diary() {
  const router = useRouter()
  const [images, setImages] = useState<DiaryImageItem[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const lastRefreshAtRef = useRef(0)
  const signedUrlCacheRef = useRef<
    Record<string, { url: string; expiresAt: number }>
  >({})

  const fetchPage = useCallback(async (targetPage: number, reset = false) => {
    const from = targetPage * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    const { data, error } = await supabase
      .from("meals")
      .select(
        `
        id,
        img_url,
        label,
        datetime,
        created_at,
        food_tags (
          id,
          name
        )
      `,
      )
      .order("datetime", { ascending: false })
      .range(from, to)

    if (error) {
      console.error("Failed to fetch diary images:", error)
      return
    }

    const rows = (data || []) as MealRow[]

    const rowsWithImagePath = rows.filter((row) => !!row.img_url)
    const now = Date.now()
    const pathsToSign = rowsWithImagePath
      .map((row) => row.img_url)
      .filter((path) => {
        const cached = signedUrlCacheRef.current[path]
        return !cached || cached.expiresAt <= now + 60 * 1000
      })

    if (pathsToSign.length > 0) {
      const { data: signedBatch, error: signedBatchError } = await supabase.storage
        .from("avatars")
        .createSignedUrls(pathsToSign, SIGNED_URL_EXPIRES_IN)

      if (signedBatchError) {
        console.error("Failed to create signed urls:", signedBatchError)
      } else {
        for (const item of signedBatch || []) {
          if (!item.path || !item.signedUrl) continue
          signedUrlCacheRef.current[item.path] = {
            url: item.signedUrl,
            expiresAt: now + SIGNED_URL_EXPIRES_IN * 1000,
          }
        }
      }
    }

    const urlResults = rowsWithImagePath.map((row) => ({
      id: row.id,
      imagePath: row.img_url,
      signedUrl: signedUrlCacheRef.current[row.img_url]?.url || "",
      label: row.label,
      datetime: row.datetime,
      createdAt: row.created_at,
      foodTags: row.food_tags || [],
    }))

    const nextItems = urlResults.filter((item) => !!item.signedUrl)
    setImages((prev) => (reset ? nextItems : mergeUniqueDiaryItems(prev, nextItems)))
    setHasMore(rows.length === PAGE_SIZE)
    setPage(targetPage)
  }, [])

  const refresh = useCallback(async () => {
    setIsInitialLoading(true)
    setHasMore(true)
    await fetchPage(0, true)
    setIsInitialLoading(false)
  }, [fetchPage])

  const loadMore = useCallback(async () => {
    if (isInitialLoading || isLoadingMore || !hasMore) return
    setIsLoadingMore(true)
    await fetchPage(page + 1, false)
    setIsLoadingMore(false)
  }, [fetchPage, hasMore, isInitialLoading, isLoadingMore, page])

  useFocusEffect(
    useCallback(() => {
      const now = Date.now()
      const shouldSkipRefresh =
        images.length > 0 && now - lastRefreshAtRef.current < REFRESH_INTERVAL_MS

      if (shouldSkipRefresh) return
      lastRefreshAtRef.current = now
      refresh()
    }, [images.length, refresh]),
  )

  const getDateKey = (item: DiaryImageItem) =>
    dayjs(item.datetime || item.createdAt).format("YYYY-MM-DD")

  const openEditMeal = (item: DiaryImageItem) =>
    router.push({
      pathname: "/modal/edit-meal",
      params: {
        mealId: item.id,
        imgUri: item.signedUrl,
      },
    })

  const renderItem = ({
    item,
    index,
  }: {
    item: DiaryImageItem
    index: number
  }) => {
    const current = dayjs(item.datetime || item.createdAt)
    const monthText = current.format("M月")
    const dayText = current.format("D")
    const currentKey = getDateKey(item)
    const prevKey = index > 0 ? getDateKey(images[index - 1]) : null
    const shouldShowDateBadge = currentKey !== prevKey

    if (viewMode === "detail") {
      return (
        <View className="px-2 pb-4">
          <Pressable
            onPress={() => openEditMeal(item)}
            className="overflow-hidden rounded-3xl border border-slate-200 bg-white"
          >
            <View className="relative">
              <ImageViewer
                imgSource={item.signedUrl}
                selectedImage={item.signedUrl}
                className="h-56 w-full"
              />
              {shouldShowDateBadge && (
                <View
                  style={{
                    position: "absolute",
                    top: 12,
                    left: 12,
                    width: 48,
                    height: 56,
                    borderRadius: 14,
                    backgroundColor: "rgba(0,0,0,0.55)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ color: "#fff", fontSize: 10, fontWeight: "600" }}>
                    {monthText}
                  </Text>
                  <Text
                    style={{
                      color: "#fff",
                      fontSize: 24,
                      fontWeight: "800",
                      lineHeight: 26,
                    }}
                  >
                    {dayText}
                  </Text>
                </View>
              )}
            </View>

            <View className="gap-3 px-4 py-4">
              <View className="flex-row items-center justify-between">
                {!!item.label ? (
                  <View
                    className="rounded-full px-3 py-1"
                    style={{
                      backgroundColor:
                        MEAL_LABEL_BADGE_STYLES[item.label].backgroundColor,
                    }}
                  >
                    <Text
                      className="text-xs font-semibold"
                      style={{ color: MEAL_LABEL_BADGE_STYLES[item.label].textColor }}
                    >
                      {MEAL_LABEL_MAP[item.label]}
                    </Text>
                  </View>
                ) : (
                  <View className="rounded-full bg-slate-100 px-3 py-1">
                    <Text className="text-xs font-semibold text-slate-500">
                      未設定
                    </Text>
                  </View>
                )}
                <Text className="text-xs font-medium text-slate-400">
                  {current.format("YYYY/MM/DD HH:mm")}
                </Text>
              </View>

              <View className="h-px bg-slate-100" />

              <View className="flex-row flex-wrap gap-2">
                {item.foodTags.length === 0 && (
                  <Text className="text-sm text-slate-400">尚未標註食物標籤</Text>
                )}
                {item.foodTags.map((tag) => (
                  <View
                    key={`${item.id}-${tag.id}`}
                    className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1"
                  >
                    <Text className="text-xs font-medium text-blue-700">
                      {tag.name}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </Pressable>
        </View>
      )
    }

    return (
      <View className="w-1/3 p-1">
        <Pressable
          onPress={() => openEditMeal(item)}
          className="relative overflow-hidden rounded-xl"
        >
          <Image
            source={{ uri: item.signedUrl }}
            style={{ width: "100%", aspectRatio: 1 }}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
          {shouldShowDateBadge && (
            <View
              style={{
                position: "absolute",
                top: 8,
                left: 8,
                width: 44,
                height: 52,
                borderRadius: 12,
                backgroundColor: "rgba(0,0,0,0.55)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "#fff", fontSize: 10, fontWeight: "600" }}>
                {monthText}
              </Text>
              <Text
                style={{
                  color: "#fff",
                  fontSize: 22,
                  fontWeight: "800",
                  lineHeight: 24,
                }}
              >
                {dayText}
              </Text>
            </View>
          )}
        </Pressable>
      </View>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50 px-2 pt-2">
      <View className="flex-row justify-end gap-2 px-2 pb-3">
        <Pressable
          onPress={() => setViewMode("grid")}
          className={`rounded-full px-4 py-2 ${
            viewMode === "grid" ? "bg-blue-600" : "bg-white"
          }`}
        >
          <Text
            className={`text-sm font-semibold ${
              viewMode === "grid" ? "text-white" : "text-slate-600"
            }`}
          >
            多格
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setViewMode("detail")}
          className={`rounded-full px-4 py-2 ${
            viewMode === "detail" ? "bg-blue-600" : "bg-white"
          }`}
        >
          <Text
            className={`text-sm font-semibold ${
              viewMode === "detail" ? "text-white" : "text-slate-600"
            }`}
          >
            詳細
          </Text>
        </Pressable>
      </View>

      {isInitialLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="small" color="#2563eb" />
        </View>
      ) : (
        <FlatList
          key={viewMode}
          data={images}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={viewMode === "grid" ? 3 : 1}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
          ListFooterComponent={
            isLoadingMore ? (
              <View className="py-3">
                <ActivityIndicator size="small" color="#2563eb" />
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  )
}
