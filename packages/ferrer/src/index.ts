if (typeof Symbol.dispose !== "symbol")
  Object.defineProperty(Symbol, "dispose", {
    configurable: false,
    enumerable: false,
    writable: false,
    value: Symbol.for("dispose")
  })

if (typeof Symbol.asyncDispose !== "symbol")
  Object.defineProperty(Symbol, "asyncDispose", {
    configurable: false,
    enumerable: false,
    writable: false,
    value: Symbol.for("asyncDispose")
  })

export * from "./core-types.js"
export * from "./global.js"
export * from "./pattern-matching.js"
export * from "./provider.js"

import { typed_name, untyped_name } from "./core-types.js"
import { bind, external } from "./global.js"

export const ferrer = { bind, external, untyped_name, typed_name }
