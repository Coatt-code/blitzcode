// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import { supabaseAdmin } from "@/lib/supabase/admin"
import type { NextAuthConfig } from "next-auth"

export const authOptions: NextAuthConfig = {
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account }) {
        const stableId = `${account!.provider}:${account!.providerAccountId}`

        await supabaseAdmin.from("users").upsert({
        id: stableId,
        email: user.email,
        name: user.name,
        image: user.image,
        })

        return true
    },

    async jwt({ token, account }) {
        if (account) {
        token.userId = `${account.provider}:${account.providerAccountId}`
        }
        return token
    },

    async session({ session, token }) {
        session.user.id = token.userId as string
        return session
    },
  }
}

// 🔑 THIS IS THE IMPORTANT PART
export const { handlers, auth } = NextAuth(authOptions)
export const { GET, POST } = handlers