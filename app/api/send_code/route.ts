export async function POST(req: Request) {
  const body = await req.json()

  const res = await fetch(process.env.JUDGE_URL + "/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  })

  const result = await res.json()
  return Response.json(result)
}
