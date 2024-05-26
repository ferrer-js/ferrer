import type { SerializableObject } from "@ferrer/utils"

/** Type alias for fully resolved names of resources */
export type Name = SerializableObject

export const TArg$ = Symbol.for("ferrer.type.arg")
export const TResult$ = Symbol.for("ferrer.type.result")

export type TypedName<TArg, TResult> = Name & {
  [TArg$]: TArg
  [TResult$]: TResult
}

export function typed_name<TArg, TResult>(name: Name) {
  return name as TypedName<TArg, TResult>
}

export function untyped_name(name: Name) {
  // `any` ok here, as user is asking for untyped name
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return name as TypedName<any, any>
}

export type UserResource<TArg, TResult> = ((
  // Make arg optional if arg type is undefined
  ...args: TArg extends undefined ? [undefined?] : [TArg]
) => Promise<TResult>) &
  Disposable
