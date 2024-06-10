// ERM polyfills
import "./erm.js"

export * from "./core-types.js"
export * from "./global.js"
export * from "./pattern-matching.js"
export * from "./provider.js"

import { local_name, name, untyped_name } from "./core-types.js"
import { bind, external } from "./global.js"

export const ferrer = { bind, external, untyped_name, name, local_name }
export default ferrer
