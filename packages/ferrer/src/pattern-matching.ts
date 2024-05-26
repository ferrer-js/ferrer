import type { SerializableArray, SerializableObject } from "@ferrer/utils"
import type { Name } from "./core-types.js"

/**
 * Determine if the given name matches the given pattern.
 */
export function matches(name: Name, pattern: Name) {
  for (const key in pattern) {
    if (!(key in name)) {
      return false
    }
    const patternValue = pattern[key]
    const objValue = name[key]

    if (typeof patternValue === "object" && patternValue !== null) {
      if (Array.isArray(patternValue)) {
        if (
          !Array.isArray(objValue) ||
          !matchesArrayPattern(objValue, patternValue)
        ) {
          return false
        }
      } else {
        if (
          typeof objValue !== "object" ||
          objValue === null ||
          Array.isArray(objValue) ||
          !matches(objValue, patternValue)
        ) {
          return false
        }
      }
    } else {
      if (objValue !== patternValue) {
        return false
      }
    }
  }
  return true
}

function matchesArrayPattern(
  arr: SerializableArray,
  pattern: SerializableArray
): boolean {
  if (arr.length !== pattern.length) {
    return false
  }
  for (let i = 0; i < arr.length; i++) {
    if (typeof pattern[i] === "object" && pattern[i] !== null) {
      if (Array.isArray(pattern[i])) {
        if (
          !Array.isArray(arr[i]) ||
          !matchesArrayPattern(
            arr[i] as SerializableArray,
            pattern[i] as SerializableArray
          )
        ) {
          return false
        }
      } else {
        if (
          typeof arr[i] !== "object" ||
          arr[i] === null ||
          Array.isArray(arr[i]) ||
          !matches(
            arr[i] as SerializableObject,
            pattern[i] as SerializableObject
          )
        ) {
          return false
        }
      }
    } else {
      if (arr[i] !== pattern[i]) {
        return false
      }
    }
  }
  return true
}
