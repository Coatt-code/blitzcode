"use client"

import { signIn, signOut, useSession } from "next-auth/react"

export default function AuthButton() {
  const { data: session, status } = useSession()

  // status: "loading" | "authenticated" | "unauthenticated"
  if (status === "loading") {
    return (
      <button disabled aria-busy="true">
        Checking…
      </button>
    )
  }

  if (status === "unauthenticated") {
    return <button onClick={() => signIn("github")}>Sign in with GitHub</button>
  }

  return <button onClick={() => signOut()}>Sign out</button>
}