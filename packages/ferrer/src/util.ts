/**
 * Type of values which may not be provided. WARNING: This should not be used
 * where TypeScript's builtin optional typing is appropriate.
 */
export type Maybe<T> = T | undefined

/**
 * Type of nullable T's
 */
export type Nullable<T> = T | null

/**
 * Generate a distinct "branded" type from the base type K, by attaching
 * a uniquely defined field. `T` should be a distinguishing string or numeric
 * constant.
 */
export type Brand<K, T> = K & { __brand__: T }

/**
 * Maximally generic object, useful for modeling runtime checking of compiletime
 * unsafe operations.
 */
export type GenericObject = { [k: string | symbol | number]: unknown }

/**
 * Type of ECMAScript constructors that can construct `T`s with argument
 * signature `A`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface Constructor<T = object, A extends unknown[] = any[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  new (...args: A): T
}

/**
 * Type of ES2015 `class`es.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Class<T = object, A extends unknown[] = any[]> = Constructor<
  T,
  A
> & {
  prototype: T
}

/**
 * Type of ECMAScript class constructors that extend the constructor `T`,
 * including the ability of specializing the constructor in derived types.
 */
export type ChildClassOf<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ConstructorT extends abstract new (...args: any) => any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  A extends unknown[] = any[]
> = Omit<ConstructorT, "constructor"> & Class<InstanceType<ConstructorT>, A>

/**
 * Type specifier for classes that implement an interface using static
 * methods. The interface `I` and its declared
 * methods will be expected as static methods on the class `C` that implements
 * `Static<I, typeof C>`. Example:
 * ```
 * interface RequiredStatics {
 *   requiredStatic(): void
 * }
 *
 * class MyClass implements Static<RequiredStatics, typeof MyClass> {
 *   static requiredStatic() {}
 * }
 * ```
 */
// Lint rule disabled here because TS does not allow a class to extend
// `unknown`.
//
// eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
export type Static<I, _C extends I> = any

/**
 * Return the class (JavaScript constructor) of an object.
 * @param x Object to examine
 * @returns The object's constructor.
 */
export function classOf<T extends object>(x: T) {
  // Disable these lint rules because `x` could be a `null`-prototype object
  // which has no constructor.
  //
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/strict-boolean-expressions
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

/**
 * Represents a traversal path within a JavaScript object.
 */
export type ObjectPath = (string | number | symbol)[]

/**
 * Attempt to get a value from a given path within an object in a paranoid
 * fashion, returning `undefined` in the event of anything missing.
 */
export function getValueAt(
  traversible: GenericObject | unknown[] | undefined,
  path?: ObjectPath
): unknown {
  if (traversible === undefined) return undefined
  if (!path || path.length === 0) return traversible
  let cur: unknown = traversible

  for (const pathEntry of path) {
    if (cur == null) return undefined

    if (Array.isArray(cur)) {
      // Allow string or number indexing into arrays.
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      cur = cur[pathEntry]
    } else if (typeof cur === "object") {
      cur = (cur as GenericObject)[pathEntry]
    } else {
      return undefined
    }
  }

  return cur
}

/**
 * Represents a traversal path within a JSON object, which path is
 * itself JSON-serializable.
 */
export type JSONObjectPath = (string | number)[]

/**
 * Determine if a given value can be used as a key on an object, avoiding
 * possible `Object` prototype pollution or injection.
 * @param key The hypothetical key
 * @returns `true` if the key can be used safely on an object, `false` otherwise
 */
export function isSafeObjectKey(key: string | number | symbol | undefined) {
  const type = typeof key
  return type === "string" ||
    type === "number" ||
    type === "symbol" ||
    type === "boolean"
    ? key !== "__proto__" &&
        key !== "constructor" &&
        key !== "hasOwnProperty" &&
        key !== "isPrototypeOf" &&
        key !== "propertyIsEnumerable" &&
        key !== "toLocaleString" &&
        key !== "toString" &&
        key !== "valueOf"
    : false
}

/**
 * Test if a value is a JavaScript object, i.e. a value possessing properties
 * @param o Value to test
 * @returns `true` if `o` is an object, `false` otherwise.
 */
export function isObject(o: unknown): boolean {
  const type = typeof o
  return type === "function" || (type === "object" && Boolean(o))
}

/**
 * Test if a value is a JavaScript primitive.
 * @param value Value to test
 * @returns `true` if `value` is a primitive, `false` otherwise.
 */
export function isPrimitive(value: unknown): boolean {
  if (value == null) return true
  const type = typeof value
  return (
    type === "string" ||
    type === "number" ||
    type === "bigint" ||
    type === "boolean"
  )
}
