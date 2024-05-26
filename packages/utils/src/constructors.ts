/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Type of ECMAScript constructors that can construct `T`s with argument
 * signature `A`.
 */
export interface Constructor<T = object, A extends unknown[] = any[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  new (...args: A): T
}

/** Type of ES2015 `class`es equal to or extending the class T. */
export type Class<T = object, A extends unknown[] = any[]> = Constructor<
  T,
  A
> & {
  prototype: T
}

/**
 * Return the class (JavaScript constructor) of an object.
 * @param x Object to examine
 * @returns The object's constructor.
 */
export function classOf<T extends object>(x: T): Constructor<T> | undefined {
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
  if (x.constructor) {
    return x.constructor as Constructor<T>
  } else {
    return undefined
  }
}

/**
 * Determine if the **class** `child` extends the **class** `parent`.
 * @param child
 * @param parent
 * @returns `true` if `child` extends `parent`, `false` if `child` is nullish, invalid, or fails to extend `parent`.
 */
export function doesExtend<T = object>(
  child: unknown,
  parent: Constructor<T>
): child is Constructor<T> {
  if (typeof child !== "function") return false
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const childProto = child.prototype
  if (typeof childProto === "object" && Boolean(childProto)) {
    return (
      (childProto as object).constructor === parent ||
      childProto instanceof parent
    )
  }
  return false
}
