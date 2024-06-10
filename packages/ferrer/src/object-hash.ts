import { isPlainObject } from "@ferrer/utils"
import { type Name } from "./core-types.js"

export function hashName(name: Name): string {
  return JSON.stringify(name, (_, val) =>
    isPlainObject(val)
      ? Object.keys(val)
          .sort()
          .reduce((result, key) => {
            result[key] = val[key]
            return result
          }, {} as any)
      : val
  )
}
