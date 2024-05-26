import { ferrer } from ".."

it("basic bind and call", async () => {
  const MathAdder = ferrer.typed_name<{ a: number; b: number }, { x: number }>({
    svc: "math",
    method: "add"
  })
  const TestSvc = ferrer.typed_name<undefined, { x: number }>({ svc: "Test" })

  ferrer.bind(
    MathAdder,
    async (context, { a, b }: { a: number; b: number }) => {
      return { x: a + b }
    }
  )

  ferrer.bind(TestSvc, async (context) => {
    using add = context.find(MathAdder)
    const { x } = await add({ a: 1, b: 2 })
    console.log(x)
    return { x }
  })

  using rsrc = ferrer.external(TestSvc)
  const { x } = await rsrc()
  expect(x).toBe(3)
})
