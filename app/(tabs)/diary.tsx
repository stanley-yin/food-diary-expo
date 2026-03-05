import { SafeAreaView } from "react-native-safe-area-context"
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native"
import { supabase } from "@/lib/supabase.web"
import { useCallback, useRef, useState } from "react"
import { Image } from "expo-image"
import { useFocusEffect } from "@react-navigation/native"
import dayjs from "dayjs"
import { useRouter } from "expo-router"

const PAGE_SIZE = 10
const SIGNED_URL_EXPIRES_IN = 60 * 60 * 24
const REFRESH_INTERVAL_MS = 30 * 1000

type DiaryImageItem = {
  id: string
  imagePath: string
  signedUrl: string
  datetime: string | null
  createdAt: string | null
}

type MealRow = {
  id: string
  img_url: string
  datetime: string | null
  created_at: string | null
}

export default function Diary() {
  const router = useRouter()
  const [images, setImages] = useState<DiaryImageItem[]>([])
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
      .select("id, img_url, datetime, created_at")
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
      datetime: row.datetime,
      createdAt: row.created_at,
    }))

    const nextItems = urlResults.filter((item) => !!item.signedUrl)
    setImages((prev) => (reset ? nextItems : [...prev, ...nextItems]))
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

    return (
      <View className="w-1/3 p-1">
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/modal/edit-meal",
              params: {
                mealId: item.id,
                imgUri: item.signedUrl,
              },
            })
          }
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
      {isInitialLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="small" color="#2563eb" />
        </View>
      ) : (
        <FlatList
          data={images}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={3}
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
