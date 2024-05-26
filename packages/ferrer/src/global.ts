import type { GenericObject } from "@ferrer/utils"
import type { TypedName, UserResource } from "./core-types.js"
import { Context, type ProviderFn } from "./provider.js"

const ctx$ = Symbol.for("ferrer.global.context")
type GlobalWithState = typeof globalThis & { [ctx$]: Context }
const globalWithState = globalThis as GlobalWithState

if ((globalThis as GenericObject)[ctx$] === undefined) {
  const globalContext = new Context()
  ;(globalThis as GenericObject)[ctx$] = globalContext
}

export function bind<TArg, TResult>(
  name: TypedName<TArg, TResult>,
  method: NoInfer<ProviderFn<TArg, TResult>>
): void {
  // XXX: eslint doesnt understand noinfer yet
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  return globalWithState[ctx$].bind<TArg, TResult>(name, method)
}

// TODO: Portal
export function external<TArg, TResult>(
  pattern: TypedName<TArg, TResult>
): UserResource<TArg, TResult> {
  return globalWithState[ctx$].find(pattern)
}
