import type { SerializableObject } from "@ferrer/utils"
import { matches } from ".."

it("pattern matching: basic", () => {
  expect(
    matches({ name: "Lord", age: 40, job: "engineer" }, { job: "engineer" })
  ).toBe(true)
  expect(
    matches({ name: "Lord", age: 40, job: "engineer" }, { job: "trash man" })
  ).toBe(false)
  expect(matches({ name: "Lord", age: 40, job: "engineer" }, { age: 40 })).toBe(
    true
  )
  expect(matches({ name: "Lord", age: 40, job: "engineer" }, {})).toBe(true)
})

it("pattern matching: nested", () => {
  const collection = [
    {
      name: "Alice",
      age: 30,
      address: { city: "Wonderland", street: "Queens Road" }
    },
    {
      name: "Bob",
      age: 25,
      address: { city: "Wonderland", street: "Kings Road" }
    },
    {
      name: "Charlie",
      age: 35,
      address: { city: "Nowhere", street: "Unknown" }
    }
  ]
  function findMatchingObjects(
    collection: SerializableObject[],
    pattern: SerializableObject
  ): SerializableObject[] {
    return collection.filter((obj) => matches(obj, pattern))
  }
  expect(
    new Set(
      findMatchingObjects(collection, { address: { city: "Wonderland" } })
    )
  ).toEqual(
    new Set([
      {
        name: "Alice",
        age: 30,
        address: { city: "Wonderland", street: "Queens Road" }
      },
      {
        name: "Bob",
        age: 25,
        address: { city: "Wonderland", street: "Kings Road" }
      }
    ])
  )
})
