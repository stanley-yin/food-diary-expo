export const MEAL_LABEL_MAP = {
  breakfast: "早餐",
  lunch: "午餐",
  dinner: "晚餐",
  late_night: "宵夜",
  afternoon_tea: "下午茶",
} as const

export type MealLabelKey = keyof typeof MEAL_LABEL_MAP

export const MEAL_LABEL_OPTIONS = Object.entries(MEAL_LABEL_MAP).map(
  ([value, label]) => ({
    value: value as MealLabelKey,
    label,
  }),
)
