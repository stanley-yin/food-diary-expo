import { useState } from "react"
import { Modal, Platform, Pressable, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import DateTimePicker from "@react-native-community/datetimepicker"
import Feather from "@expo/vector-icons/Feather"

type Props = {
  value: Date
  onChange: (date: Date) => void
}

const formatDatetime = (date: Date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  const h = String(date.getHours()).padStart(2, "0")
  const min = String(date.getMinutes()).padStart(2, "0")
  return `${y}/${m}/${d} ${h}:${min}`
}

export default function DateTimePickerField({ value, onChange }: Props) {
  const [showPicker, setShowPicker] = useState(false)
  const insets = useSafeAreaInsets()

  return (
    <>
      <Pressable
        onPress={() => setShowPicker(true)}
        className="flex-row items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
      >
        <Feather name="clock" size={14} color="#94a3b8" />
        <Text className="flex-1 text-sm font-medium text-slate-700">
          {formatDatetime(value)}
        </Text>
        <Feather name="chevron-down" size={14} color="#94a3b8" />
      </Pressable>

      <Modal
        visible={showPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPicker(false)}
      >
        <View className="flex-1 justify-end">
          <Pressable
            className="absolute inset-0 bg-black/40"
            onPress={() => setShowPicker(false)}
          />
          <View className="bg-white" style={{ paddingBottom: insets.bottom }}>
            <View className="flex-row items-center justify-between border-b border-slate-100 px-4 py-3">
              <Text className="text-base font-semibold text-slate-800">用餐時間</Text>
              <Pressable onPress={() => setShowPicker(false)}>
                <Text className="text-base font-semibold text-blue-600">完成</Text>
              </Pressable>
            </View>
            <View className="items-center">
              <DateTimePicker
                value={value}
                mode="datetime"
                display="spinner"
                textColor="#000000"
                onChange={(event, selectedDate) => {
                  if (Platform.OS === "android") setShowPicker(false)
                  if (selectedDate) onChange(selectedDate)
                }}
                style={{ height: 200 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  )
}
