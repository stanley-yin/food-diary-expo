import { SafeAreaView } from "react-native-safe-area-context"
import { ActivityIndicator, Dimensions, FlatList, Pressable, Text, View } from "react-native"
import { supabase } from "@/lib/supabase.web"
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
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
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated"

const SIGNED_URL_EXPIRES_IN = 60 * 60 * 24
const REFRESH_INTERVAL_MS = 30 * 1000
const DOW_LABELS = ["日", "一", "二", "三", "四", "五", "六"]
const SCREEN_WIDTH = Dimensions.get("window").width

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

export default function Diary() {
  const router = useRouter()
  const today = useMemo(() => dayjs().format("YYYY-MM-DD"), [])
  const [selectedDate, setSelectedDate] = useState(today)
  const [images, setImages] = useState<DiaryImageItem[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [isLoading, setIsLoading] = useState(true)
  const [datesWithData, setDatesWithData] = useState<Set<string>>(new Set())
  const lastRefreshAtRef = useRef(0)
  const signedUrlCacheRef = useRef<Record<string, { url: string; expiresAt: number }>>({})
  const panX = useSharedValue(0)

  const weekDates = useMemo(() => {
    const start = dayjs(selectedDate).startOf("week")
    return Array.from({ length: 7 }, (_, i) =>
      start.add(i, "day").format("YYYY-MM-DD"),
    )
  }, [selectedDate])

  const prevWeekDates = useMemo(() => {
    const start = dayjs(selectedDate).subtract(7, "day").startOf("week")
    return Array.from({ length: 7 }, (_, i) => start.add(i, "day").format("YYYY-MM-DD"))
  }, [selectedDate])

  const nextWeekDates = useMemo(() => {
    const start = dayjs(selectedDate).add(7, "day").startOf("week")
    return Array.from({ length: 7 }, (_, i) => start.add(i, "day").format("YYYY-MM-DD"))
  }, [selectedDate])

  const fetchForDate = useCallback(async (date: string) => {
    lastRefreshAtRef.current = Date.now()
    setIsLoading(true)

    const start = dayjs(date).startOf("day").toISOString()
    const end = dayjs(date).endOf("day").toISOString()

    const { data, error } = await supabase
      .from("meals")
      .select(`id, img_url, label, datetime, created_at, food_tags (id, name)`)
      .gte("datetime", start)
      .lte("datetime", end)
      .order("datetime", { ascending: false })

    if (error) {
      console.error("Failed to fetch diary images:", error)
      setIsLoading(false)
      return
    }

    const rows = (data || []) as MealRow[]
    const rowsWithImage = rows.filter((row) => !!row.img_url)
    const now = Date.now()
    const pathsToSign = rowsWithImage
      .map((row) => row.img_url)
      .filter((path) => {
        const cached = signedUrlCacheRef.current[path]
        return !cached || cached.expiresAt <= now + 60 * 1000
      })

    if (pathsToSign.length > 0) {
      const { data: signedBatch, error: signedBatchError } = await supabase.storage
        .from("avatars")
        .createSignedUrls(pathsToSign, SIGNED_URL_EXPIRES_IN)

      if (!signedBatchError) {
        for (const item of signedBatch || []) {
          if (!item.path || !item.signedUrl) continue
          signedUrlCacheRef.current[item.path] = {
            url: item.signedUrl,
            expiresAt: now + SIGNED_URL_EXPIRES_IN * 1000,
          }
        }
      }
    }

    const nextItems = rowsWithImage
      .map((row) => ({
        id: row.id,
        imagePath: row.img_url,
        signedUrl: signedUrlCacheRef.current[row.img_url]?.url || "",
        label: row.label,
        datetime: row.datetime,
        createdAt: row.created_at,
        foodTags: row.food_tags || [],
      }))
      .filter((item) => !!item.signedUrl)

    setImages(nextItems)
    setIsLoading(false)
  }, [])

  const fetchDatesWithData = useCallback(async (anchorDate: string) => {
    const rangeStart = dayjs(anchorDate).subtract(7, "day").startOf("week").startOf("day").toISOString()
    const rangeEnd = dayjs(anchorDate).add(7, "day").endOf("week").endOf("day").toISOString()

    const { data, error } = await supabase
      .from("meals")
      .select("datetime, created_at")
      .not("img_url", "is", null)
      .gte("datetime", rangeStart)
      .lte("datetime", rangeEnd)

    if (error || !data) return

    setDatesWithData(
      new Set(data.map((row) => dayjs(row.datetime || row.created_at).format("YYYY-MM-DD"))),
    )
  }, [])

  useEffect(() => {
    fetchForDate(selectedDate)
  }, [fetchForDate, selectedDate])

  useEffect(() => {
    fetchDatesWithData(selectedDate)
  }, [fetchDatesWithData, selectedDate])

  useFocusEffect(
    useCallback(() => {
      const now = Date.now()
      if (now - lastRefreshAtRef.current < REFRESH_INTERVAL_MS) return
      fetchForDate(selectedDate)
      fetchDatesWithData(selectedDate)
    }, [fetchForDate, fetchDatesWithData, selectedDate]),
  )

  const goToPrevDay = useCallback(() => {
    setSelectedDate((prev) => dayjs(prev).subtract(1, "day").format("YYYY-MM-DD"))
  }, [])

  const goToNextDay = useCallback(() => {
    setSelectedDate((prev) => {
      const next = dayjs(prev).add(1, "day")
      return next.format("YYYY-MM-DD") <= today ? next.format("YYYY-MM-DD") : today
    })
  }, [today])

  const daySwipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-20, 20])
        .failOffsetY([-15, 15])
        .onEnd((e) => {
          const shouldNavigate = Math.abs(e.translationX) > 40 || Math.abs(e.velocityX) > 400
          if (!shouldNavigate) return
          const goingBack = e.velocityX > 0 || (e.velocityX === 0 && e.translationX > 0)
          if (goingBack) runOnJS(goToPrevDay)()
          else runOnJS(goToNextDay)()
        }),
    [goToPrevDay, goToNextDay],
  )

  const didSwipeRef = useRef(false)

  const onSwipeComplete = useCallback((goingBack: boolean) => {
    didSwipeRef.current = true
    setSelectedDate((prev) => {
      if (goingBack) return dayjs(prev).subtract(7, "day").format("YYYY-MM-DD")
      const next = dayjs(prev).add(7, "day")
      return next.format("YYYY-MM-DD") <= today ? next.format("YYYY-MM-DD") : today
    })
  }, [today])

  // Reset panX after React has committed the new week data, eliminating the jitter
  useLayoutEffect(() => {
    if (didSwipeRef.current) {
      didSwipeRef.current = false
      panX.value = 0
    }
  }, [selectedDate, panX])

  // Container starts offset -SCREEN_WIDTH so the middle panel is visible
  const calendarContainerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -SCREEN_WIDTH + panX.value }],
  }))

  const swipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-15, 15])
        .failOffsetY([-15, 15])
        .onUpdate((e) => {
          panX.value = e.translationX
        })
        .onEnd((e) => {
          const shouldNavigate = Math.abs(e.translationX) > 40 || Math.abs(e.velocityX) > 400
          if (shouldNavigate) {
            const goingBack = e.velocityX > 0 || (e.velocityX === 0 && e.translationX > 0)
            const target = goingBack ? SCREEN_WIDTH : -SCREEN_WIDTH
            panX.value = withSpring(
              target,
              { damping: 40, stiffness: 400, mass: 0.8 },
              (finished) => {
                if (!finished) return
                runOnJS(onSwipeComplete)(goingBack)
                // panX reset is handled by useLayoutEffect after React re-renders
              },
            )
          } else {
            panX.value = withSpring(0, { damping: 20, stiffness: 300 })
          }
        }),
    [onSwipeComplete, panX],
  )

  const openEditMeal = (item: DiaryImageItem) =>
    router.push({
      pathname: "/modal/edit-meal",
      params: { mealId: item.id, imgUri: item.signedUrl },
    })


  const renderItem = ({ item }: { item: DiaryImageItem }) => {
    const current = dayjs(item.datetime || item.createdAt)

    if (viewMode === "detail") {
      return (
        <View className="px-2 pb-4">
          <Pressable
            onPress={() => openEditMeal(item)}
            className="overflow-hidden rounded-3xl border border-slate-200 bg-white"
          >
            <ImageViewer
              imgSource={item.signedUrl}
              selectedImage={item.signedUrl}
              className="h-56 w-full"
            />
            <View className="gap-3 px-4 py-4">
              <View className="flex-row items-center justify-between">
                {!!item.label ? (
                  <View
                    className="rounded-full px-3 py-1"
                    style={{
                      backgroundColor: MEAL_LABEL_BADGE_STYLES[item.label].backgroundColor,
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
                    <Text className="text-xs font-semibold text-slate-500">未設定</Text>
                  </View>
                )}
                <Text className="text-xs font-medium text-slate-400">
                  {current.format("HH:mm")}
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
                    <Text className="text-xs font-medium text-blue-700">{tag.name}</Text>
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
          <View
            style={{
              position: "absolute",
              bottom: 6,
              left: 6,
              borderRadius: 8,
              backgroundColor: "rgba(0,0,0,0.5)",
              paddingHorizontal: 6,
              paddingVertical: 2,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 10, fontWeight: "600" }}>
              {current.format("HH:mm")}
            </Text>
          </View>
        </Pressable>
      </View>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
      <GestureDetector gesture={swipeGesture}>
      <View className="border-b border-slate-100 bg-white" style={{ overflow: "hidden" }}>
        <Animated.View
          style={[{ flexDirection: "row", width: SCREEN_WIDTH * 3 }, calendarContainerStyle]}
        >
          {[prevWeekDates, weekDates, nextWeekDates].map((dates, panelIdx) => (
            <View key={panelIdx} style={{ width: SCREEN_WIDTH }} className="px-4 pb-2 pt-3">
              <Text className="mb-2 text-xs font-semibold text-slate-400">
                {dayjs(dates[3]).format("YYYY年M月")}
              </Text>
              <View className="flex-row">
                {dates.map((date) => {
                  const d = dayjs(date)
                  const isSelected = date === selectedDate
                  const isToday = date === today
                  const isFuture = date > today
                  return (
                    <Pressable
                      key={date}
                      onPress={() => !isFuture && setSelectedDate(date)}
                      disabled={isFuture}
                      className="flex-1 items-center pb-1"
                    >
                      <Text
                        className={`text-xs ${
                          isSelected
                            ? "font-semibold text-blue-600"
                            : isFuture
                              ? "text-slate-200"
                              : "text-slate-400"
                        }`}
                      >
                        {DOW_LABELS[d.day()]}
                      </Text>
                      <View
                        className={`mt-0.5 h-8 w-8 items-center justify-center rounded-full ${isSelected ? "bg-blue-600" : ""}`}
                      >
                        <Text
                          className={`text-sm font-semibold ${
                            isSelected
                              ? "text-white"
                              : isFuture
                                ? "text-slate-300"
                                : isToday
                                  ? "text-blue-600"
                                  : "text-slate-700"
                          }`}
                        >
                          {d.format("D")}
                        </Text>
                      </View>
                      {!isSelected && (datesWithData.has(date) || isToday) && (
                        <View
                          className={`mt-0.5 h-1 w-1 rounded-full ${datesWithData.has(date) ? "bg-red-400" : "bg-blue-500"}`}
                        />
                      )}
                    </Pressable>
                  )
                })}
              </View>
            </View>
          ))}
        </Animated.View>
      </View>
      </GestureDetector>

      <View className="flex-row justify-end gap-2 px-4 py-2">
        <Pressable
          onPress={() => setViewMode("grid")}
          className={`rounded-full px-4 py-2 ${viewMode === "grid" ? "bg-blue-600" : "bg-white"}`}
        >
          <Text
            className={`text-sm font-semibold ${viewMode === "grid" ? "text-white" : "text-slate-600"}`}
          >
            多格
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setViewMode("detail")}
          className={`rounded-full px-4 py-2 ${viewMode === "detail" ? "bg-blue-600" : "bg-white"}`}
        >
          <Text
            className={`text-sm font-semibold ${viewMode === "detail" ? "text-white" : "text-slate-600"}`}
          >
            詳細
          </Text>
        </Pressable>
      </View>

      <GestureDetector gesture={daySwipeGesture}>
        <View className="flex-1">
          {isLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="small" color="#2563eb" />
            </View>
          ) : images.length === 0 ? (
            <View className="flex-1 items-center justify-center gap-2">
              <Text className="text-base font-semibold text-slate-300">這天沒有餐點記錄</Text>
            </View>
          ) : (
            <FlatList
              key={viewMode}
              data={images}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              numColumns={viewMode === "grid" ? 3 : 1}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 32, paddingHorizontal: 8 }}
            />
          )}
        </View>
      </GestureDetector>
    </SafeAreaView>
  )
}
