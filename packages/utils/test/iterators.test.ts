import { PushableAsyncIterator, asyncAll, concatIterables } from ".."

test("concatIterables", () => {
  const iterator = concatIterables([1, 2], [3, 4])
  const result = Array.from(iterator)
  expect(result).toEqual([1, 2, 3, 4])
})

it("PAI: push", async () => {
  const pai = new PushableAsyncIterator()
  pai.pushValue(1)
  pai.pushValue(2)
  pai.return(3)

  let next = await pai.next()
  expect(next.value).toEqual(1)
  next = await pai.next()
  expect(next.value).toEqual(2)
  next = await pai.next()
  expect(next).toEqual({ value: 3, done: true })
  next = await pai.next()
  expect(next).toEqual({ value: undefined, done: true })
})

it("PAI: pull", async () => {
  const pai = new PushableAsyncIterator()
  const p1 = pai.next()
  const p2 = pai.next()
  const p3 = pai.next()
  pai.pushValue(1)
  pai.return(2)

  let next = await p1
  expect(next.value).toEqual(1)
  next = await p2
  expect(next).toEqual({ value: 2, done: true })
  next = await p3
  expect(next).toEqual({ value: undefined, done: true })
})

it("PAI: throw push", async () => {
  const pai = new PushableAsyncIterator()
  pai.pushValue(1)
  pai.throw(new Error("thrown from pai")).catch(() => undefined)

  let next = await pai.next()
  expect(next.value).toEqual(1)
  try {
    next = await pai.next()
    throw new Error("should never get here")
  } catch (err) {
    expect((err as Error).message).toEqual("thrown from pai")
  }
  next = await pai.next()
  expect(next).toEqual({ value: undefined, done: true })
})

it("PAI: throw pull", async () => {
  const pai = new PushableAsyncIterator()
  const p1 = pai.next()
  const p2 = pai.next()
  const p3 = pai.next()
  pai.pushValue(1)
  pai.throw(new Error("thrown from pai")).catch(() => undefined)

  let next = await p1
  expect(next.value).toEqual(1)
  try {
    next = await p2
    throw new Error("should never get here")
  } catch (err) {
    expect((err as Error).message).toEqual("thrown from pai")
  }
  next = await p3
  expect(next).toEqual({ value: undefined, done: true })
})

it("asyncAll: basic", async () => {
  const pai = new PushableAsyncIterator<number>()
  const pai2 = new PushableAsyncIterator<string>()
  pai.pushValue(1)
  pai.return(2)
  pai2.pushValue("3")
  pai2.return("4")

  const gen = asyncAll(pai, pai2)

  let next = await gen.next()
  console.log(next)
  expect(next.value).toEqual([1, undefined])
  next = await gen.next()
  console.log(next)
  expect(next.value).toEqual([undefined, "3"])
  next = await gen.next()
  console.log(next)
  expect(next).toEqual({ value: [2, "4"], done: true })
  next = await gen.next()
  expect(next).toEqual({ value: undefined, done: true })
})

it("asyncAll: throw", async () => {
  const pai = new PushableAsyncIterator()
  pai.pushValue(1)
  pai.throw(new Error("thrown from generator")).catch(() => undefined)

  const gen = asyncAll(pai)

  let next = await gen.next()
  expect(next.value).toEqual([1])
  try {
    next = await gen.next()
    throw new Error("Failed")
  } catch (err) {
    expect((err as Error).message).toEqual("thrown from generator")
  }
  next = await gen.next()
  console.log(next)
})
