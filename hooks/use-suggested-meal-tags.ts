import { useAuthContext } from "@/hooks/use-auth-context"
import { type MealLabelKey } from "@/constants/meal-label"
import { supabase } from "@/lib/supabase.web"
import { useEffect, useMemo, useState } from "react"

const MAX_SUGGESTIONS = 6

type MealWithTags = {
  label?: MealLabelKey | null
  food_tags?: { name: string }[]
}

const rankTags = (counts: Map<string, number>) =>
  [...counts.entries()]
    .sort((left, right) => {
      if (right[1] !== left[1]) return right[1] - left[1]
      return left[0].localeCompare(right[0], "zh-Hant")
    })
    .map(([name]) => name)

export function useSuggestedMealTags(
  label: MealLabelKey,
  selectedTags: string[],
) {
  const { session } = useAuthContext()
  const [history, setHistory] = useState<MealWithTags[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const userId = session?.user?.id
    if (!userId) {
      setHistory([])
      return
    }

    let isMounted = true

    const fetchHistory = async () => {
      setIsLoading(true)

      try {
        const { data, error } = await supabase
          .from("meals")
          .select(
            `
            label,
            food_tags (
              name
            )
          `,
          )
          .eq("user_id", userId)
          .order("datetime", { ascending: false })
          .limit(200)

        if (error) throw error
        if (!isMounted) return
        setHistory((data || []) as MealWithTags[])
      } catch (error) {
        console.error("Failed to fetch suggested meal tags:", error)
        if (!isMounted) return
        setHistory([])
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    fetchHistory()

    return () => {
      isMounted = false
    }
  }, [session?.user?.id])

  const suggestions = useMemo(() => {
    const normalizedSelectedTags = new Set(
      selectedTags.map((tag) => tag.trim()).filter(Boolean),
    )
    const mealLabelCounts = new Map<string, number>()
    const globalCounts = new Map<string, number>()

    for (const meal of history) {
      const uniqueTags = [...new Set((meal.food_tags || []).map((item) => item.name.trim()))]
        .filter(Boolean)

      for (const tag of uniqueTags) {
        globalCounts.set(tag, (globalCounts.get(tag) || 0) + 1)
        if (meal.label === label) {
          mealLabelCounts.set(tag, (mealLabelCounts.get(tag) || 0) + 1)
        }
      }
    }

    const mergedSuggestions: string[] = []
    for (const tag of rankTags(mealLabelCounts)) {
      if (normalizedSelectedTags.has(tag) || mergedSuggestions.includes(tag)) continue
      mergedSuggestions.push(tag)
      if (mergedSuggestions.length >= MAX_SUGGESTIONS) return mergedSuggestions
    }

    for (const tag of rankTags(globalCounts)) {
      if (normalizedSelectedTags.has(tag) || mergedSuggestions.includes(tag)) continue
      mergedSuggestions.push(tag)
      if (mergedSuggestions.length >= MAX_SUGGESTIONS) break
    }

    return mergedSuggestions
  }, [history, label, selectedTags])

  return {
    suggestions,
    isLoading,
  }
}
