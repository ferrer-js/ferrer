import type { GenericObject } from "@ferrer/utils"
import type { Atom, AtomFunction, TypedName } from "./core-types.js"
import { Domain } from "./provider.js"

const dom$ = Symbol.for("ferrer.global.domain")
type GlobalWithState = typeof globalThis & { [dom$]: Domain }
const globalWithState = globalThis as GlobalWithState

if ((globalThis as GenericObject)[dom$] === undefined) {
  const globalDomain = new Domain()
  ;(globalThis as GenericObject)[dom$] = globalDomain
}

export function bind<TArg, TResult>(
  name: TypedName<TArg, TResult>,
  method: NoInfer<AtomFunction<TArg, TResult>>
): void {
  return globalWithState[dom$].bind<TArg, TResult>(name, method)
}

/**
 * Retrieve an externally-usable handle to a resource within the global
 * domain for this runtime environment.
 */
export function external<TArg, TResult>(
  pattern: TypedName<TArg, TResult>
): Atom<TArg, TResult> {
  return globalWithState[dom$].localIngress.externalize<TArg, TResult>(pattern)
}
