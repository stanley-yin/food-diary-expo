import React, { ButtonHTMLAttributes } from "react"
import { Text, TouchableOpacity } from "react-native"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "soft" | "danger" | "ghost"
  size?: "sm" | "md" | "lg" | "icon"
  fullWidth?: boolean
  isLoading?: boolean
  leftIcon?: React.ReactNode
  onPress?: () => void
}

const ThemeButton: React.FC<ButtonProps> = ({
  title,
  variant = "primary",
  size = "md",
  fullWidth = false,
  isLoading = false,
  leftIcon,
  className = "",
  disabled,
  onPress,
}) => {
  const baseStyles =
    "inline-flex items-center justify-center font-bold transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"

  const variants = {
    primary:
      "bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700",
    secondary:
      "bg-white text-blue-600 border border-blue-200 shadow-sm hover:bg-gray-50",
    soft: "bg-blue-100 text-blue-700 hover:bg-blue-200",
    danger: "bg-white text-red-500 hover:bg-red-50",
    ghost: "bg-transparent text-gray-500 hover:bg-gray-100",
  }

  const sizes = {
    sm: "text-xs px-3 py-1.5 rounded-lg",
    md: "text-sm px-4 py-3 rounded-xl",
    lg: "text-lg px-6 py-4 rounded-2xl",
    icon: "p-2 rounded-full aspect-square",
  }

  const widthClass = fullWidth ? "w-full" : ""

  return (
    <TouchableOpacity
      onPress={onPress}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${widthClass} ${className}`}
      disabled={disabled || isLoading}
    >
      <Text>{title}</Text>
    </TouchableOpacity>
  )
}

export default ThemeButton
