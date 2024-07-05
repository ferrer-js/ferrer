import type { SerializableObject } from "@ferrer/utils"

/** The name of a resource, which is ultimately a plain JSON object. */
export type Name = SerializableObject

export const TArg$ = Symbol.for("ferrer.type.arg")
export const TResult$ = Symbol.for("ferrer.type.result")

/** A `Name` that carries additional type information about the argument and return value from a resource. */
export type TypedName<TArg, TResult> = Name & {
  [TArg$]: TArg
  [TResult$]: TResult
}

/**
 * Create a ferrer name that carries TypeScript information along with it. Arguments
 * must be serializable for general names; use `local_name` for non-serializable
 * arguments that cannot cross domain boundaries.
 */
export function name<
  TArg extends SerializableObject | undefined,
  TResult extends SerializableObject | undefined
>(name: Name) {
  return name as TypedName<TArg, TResult>
}

/**
 * A typed ferrer name that requires locality. Requests for this atom
 * may not cross domain boundaries. In exchange, this atom may receive and
 * return non-serializable objects, since it is guaranteed to be
 * an in-process async function call.
 */
export function local_name<TArg, TResult>(name: Name) {
  return Object.assign(name, { local: true }) as Name as TypedName<
    TArg,
    TResult
  >
}

/**
 * Forcibly escapes from the TypeScript type system by typing a resource
 * as `any`.
 */
export function untyped_name(name: Name) {
  // `any` ok here, as user is asking for untyped name
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return name as TypedName<any, any>
}
