/** JS primitive types */
export type Primitive = number | bigint | string | boolean | null

/** Serializable primitive types. (JSON cannot serialize BigInts.) */
export type SerializablePrimitive = number | string | boolean | null

/** Determine if `value` is a JS primitive. */
export function isPrimitive(value: unknown): value is Primitive {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  )
}

/** Determine if `value` is a serializable primitive. */
export function isSerializablePrimitive(
  value: unknown
): value is SerializablePrimitive {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  )
}

/** Type of a maximally generic object. */
export type GenericObject = { [key: string | symbol | number]: unknown }

/** Representation of a traversal path within a tree of JS objects. */
export type ObjectPath = (string | number | symbol)[]

/**
 * Test if a value is a JavaScript object, i.e. a value possessing properties.
 * `null` is not considered an object by this test.
 */
export function isObject(o: unknown): o is object {
  const type = typeof o
  return type === "function" || (type === "object" && Boolean(o))
}

/**
 * Determine if a given value can be used as a key on an object, avoiding
 * possible `Object` prototype pollution or injection.
 */
export function isSafeObjectKey(key: unknown): key is string | number | symbol {
  const type = typeof key
  return type === "string" || type === "number" || type === "symbol"
    ? key !== "__proto__" &&
        key !== "prototype" &&
        key !== "constructor" &&
        key !== "hasOwnProperty" &&
        key !== "isPrototypeOf" &&
        key !== "propertyIsEnumerable" &&
        key !== "toLocaleString" &&
        key !== "toString" &&
        key !== "valueOf"
    : false
}

function _fastIsSafeObjectKey(key: string | number | symbol): boolean {
  return (
    key !== "__proto__" &&
    key !== "prototype" &&
    key !== "constructor" &&
    key !== "hasOwnProperty" &&
    key !== "isPrototypeOf" &&
    key !== "propertyIsEnumerable" &&
    key !== "toLocaleString" &&
    key !== "toString" &&
    key !== "valueOf"
  )
}

/** Type of a value that can be entirely serialized, e.g. via JSON.stringify */
export type SerializableValue =
  | SerializablePrimitive
  | SerializableObject
  | SerializableArray

/** Type of an object that can be fully serialized. */
export type SerializableObject = {
  [key: string]: SerializableValue
}

/** Type of an array that can be fully serialized. */
export type SerializableArray = SerializableValue[]

/** Representation of a traversal path through a serializable object tree. */
export type SerializableObjectPath = (string | number)[]

/**
 * Attempt to get a value from a given path within an object in a paranoid
 * fashion, returning `undefined` in the event of anything missing.
 */
export function at(
  traversible: GenericObject | unknown[] | undefined,
  path?: ObjectPath
): unknown {
  if (traversible === undefined) return undefined
  if (!path || path.length === 0) return traversible
  let cur: unknown = traversible

  for (const pathEntry of path) {
    if (cur == null) return undefined
    if (!_fastIsSafeObjectKey(pathEntry)) return undefined

    if (Array.isArray(cur)) {
      // Allow string or number indexing into arrays, e.g. for "length"
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
 * Attempt to get a serializable value from a path within a fully serializable
 * tree of objects. Returns `undefined` if anything is missing along the path.
 */
export function valueAt(
  traversible: SerializableValue | undefined,
  path?: SerializableObjectPath
): SerializableValue | undefined {
  if (traversible === undefined) return undefined
  if (!path || path.length === 0) return traversible
  if (isSerializablePrimitive(traversible)) {
    return undefined
  }
  return at(traversible, path) as SerializableValue | undefined
}

/** Find a serializable value at a path and coerce to string. */
export function getString(
  value: SerializableValue | undefined,
  path?: SerializableObjectPath
) {
  const val = valueAt(value, path)
  if (val === undefined) return undefined
  else return String(val)
}

/** Find a numeric value at a path, optionally defaulting when absent. */
export function getNumber(
  json: SerializableValue | undefined,
  path?: SerializableObjectPath
): number | undefined
export function getNumber(
  json: SerializableValue | undefined,
  path: SerializableObjectPath,
  defaultValue: number
): number
export function getNumber(
  json: SerializableValue | undefined,
  path?: SerializableObjectPath,
  defaultValue?: number
) {
  const val = valueAt(json, path)
  if (val === undefined) return defaultValue
  else return Number(val)
}

/** Find a boolean value at a path */
export function getBoolean(
  json: SerializableValue | undefined,
  path?: SerializableObjectPath
): boolean {
  const val = valueAt(json, path)
  if (val === undefined) return false
  else return Boolean(val)
}

/** Find a serializable object at the given path. */
export function getObject(
  json: SerializableValue | undefined,
  path?: SerializableObjectPath
): SerializableObject | undefined {
  const val = valueAt(json, path)
  if (val == null || !(typeof val === "object") || Array.isArray(val))
    return undefined
  return val
}

/** Find a serializable array at the given path. */
export function getArray(
  json: SerializableValue | undefined,
  path?: SerializableObjectPath
): SerializableArray | undefined {
  const val = valueAt(json, path)
  if (val != null && Array.isArray(val)) return val
  return undefined
}
