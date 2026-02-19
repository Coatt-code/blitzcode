"use server";

export async function sendCode(code: string) {
  const res = await fetch("http://localhost:3000/api/send_code", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ code: code }),
  })
  const data = await res.json()
  console.log(data)
}