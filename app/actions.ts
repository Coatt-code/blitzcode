"use server";
import { send_code } from "./api/send_code/route";

export async function saveCode(code: string) {
  console.log("Server received:", code);
  const res = await send_code(`cat <<EOF > code.py
${code}
EOF
`);
  const resParsed = await res.json()

  return resParsed
}