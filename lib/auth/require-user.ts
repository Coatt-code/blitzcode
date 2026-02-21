import { auth } from "@/app/api/auth/[...nextauth]/route"

export async function requireUser() {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error("UNAUTHENTICATED")
  }
  return session.user
}