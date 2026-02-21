// app/account/page.tsx
import { auth } from "@/app/api/auth/[...nextauth]/route"
import { supabaseAdmin } from "@/lib/supabase/admin"

export default async function AccountPage() {
  const session = await auth()
  if (!session?.user?.id) return <p>Not signed in</p>

  const { data: userRow, error } = await supabaseAdmin
    .from("users")
    .select("name,email,image")
    .eq("id", session.user.id)
    .single()
    if (error) console.log(error)
    console.log(session.user.id)

    if (error || !userRow) return <p>Couldn’t load user 😅</p>

  return (
    <div>
      <h1>Account</h1>
      {userRow.image && (
        <img src={userRow.image} alt={userRow.name ?? "Profile"} width={64} height={64} />
      )}
      <p>Name: {userRow.name ?? "Unknown"}</p>
      <p>Email: {userRow.email ?? "Unknown"}</p>
    </div>
  )
}