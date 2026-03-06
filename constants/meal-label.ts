export const MEAL_LABEL_MAP = {
  breakfast: "早餐",
  lunch: "午餐",
  dinner: "晚餐",
  late_night: "宵夜",
  afternoon_tea: "下午茶",
} as const

export type MealLabelKey = keyof typeof MEAL_LABEL_MAP

export const MEAL_LABEL_BADGE_STYLES: Record<
  MealLabelKey,
  {
    backgroundColor: string
    textColor: string
  }
> = {
  breakfast: {
    backgroundColor: "#FEF3C7",
    textColor: "#B45309",
  },
  lunch: {
    backgroundColor: "#D1FAE5",
    textColor: "#047857",
  },
  dinner: {
    backgroundColor: "#E0E7FF",
    textColor: "#4338CA",
  },
  afternoon_tea: {
    backgroundColor: "#FFE4E6",
    textColor: "#BE185D",
  },
  late_night: {
    backgroundColor: "#E2E8F0",
    textColor: "#334155",
  },
}

export const MEAL_LABEL_OPTIONS = Object.entries(MEAL_LABEL_MAP).map(
  ([value, label]) => ({
    value: value as MealLabelKey,
    label,
  }),
)
