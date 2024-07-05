import { ferrer } from ".."

it("basic bind and call", async () => {
  const Adder = ferrer.name<{ a: number; b: number }, { sum: number }>({
    svc: "math",
    method: "add"
  })
  const TestSvc = ferrer.name<undefined, { sum: number }>({ svc: "Test" })

  ferrer.bind(Adder, async (context, { a, b }) => {
    console.log("Adder trace", context.trace)
    return { sum: a + b }
  })

  ferrer.bind(TestSvc, async (context) => {
    console.log("TestSvc trace", context.trace)
    using add = context.find(Adder)
    const { sum } = await add({ a: 1, b: 2 })
    console.log("sum", sum)
    return { sum }
  })

  using rsrc = ferrer.external(TestSvc)
  const { sum } = await rsrc()
  expect(sum).toBe(3)
})
