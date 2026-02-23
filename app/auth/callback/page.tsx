'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase/client'
import { Spinner } from "@/components/ui/spinner";

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    // This finalizes the session from the URL hash
    supabaseBrowser.auth.getSession().then(() => {
      router.replace('/main')
    })
  }, [router])

  return (<>
      <div className="w-screen min-h-[100dvh] justify-center items-center flex">
        <Spinner className="size-8" />
      </div>
    </>)
}