'use client'

import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from '@/components/ui/button'
import { GithubIcon } from '@/components/icons/simple-icons-github'
import { GoogleIcon } from '@/components/icons/simple-icons-google'
import { useRouter } from 'next/navigation'

type Provider = 'github' | 'google'

export default function AuthButton() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1) Get initial user
    supabaseBrowser.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })

    // 2) Listen for auth changes
    const {
      data: { subscription },
    } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])
  
  async function signIn(provider: Provider) {
    await supabaseBrowser.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    })
  }

  async function signOut() {
    await supabaseBrowser.auth.signOut()
  }
  const router = useRouter();
  function toMain() {
    router.replace('/main')
  }

  if (loading) {
    return (
      <div className='min-h-[100dvh] w-screen justify-center items-center flex px-3'>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign up to continue</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full" onClick={() => signIn('github')}>
            <GithubIcon fill='#FFFFFF' stroke='none' className='overflow-visible'/> Sign in with GitHub
          </Button>
          <Button variant="outline" className="w-full mt-3" onClick={() => signIn('google')}>
            <GoogleIcon fill='#FFFFFF' strokeWidth={0.5}  className='overflow-visible'/> Sign in with Google
          </Button>
        </CardContent>
      </Card>
    </div>
    )
  }

  return user ? (
    
    <div className='min-h-[100dvh] w-screen justify-center items-center flex px-3'>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Signed in as {user?.user_metadata.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <Button className="w-full" onClick={toMain}>
            Proceed
          </Button>
          <Button variant="destructive" className="w-full mt-3" onClick={signOut}>
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  ) : (
    <div className='min-h-[100dvh] w-screen justify-center items-center flex px-3'>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign up to continue</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full" onClick={() => signIn('github')}>
            <GithubIcon fill='#FFFFFF' stroke='none' className='overflow-visible'/> Sign in with GitHub
          </Button>
          <Button variant="outline" className="w-full mt-3" onClick={() => signIn('google')}>
            <GoogleIcon fill='#FFFFFF' strokeWidth={0.5} className='overflow-visible'/> Sign in with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}