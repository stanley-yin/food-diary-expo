import { defaultConfig } from "@tamagui/config/v4"
import { createTamagui } from "tamagui"
import { themes } from "./constants/theme"

export const tamaguiConfig = createTamagui({ ...defaultConfig, themes })

export default tamaguiConfig

export type Conf = typeof tamaguiConfig

declare module "tamagui" {
  interface TamaguiCustomConfig extends Conf {}
}
