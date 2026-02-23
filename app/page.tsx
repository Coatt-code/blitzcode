"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Item, ItemActions, ItemContent, ItemTitle } from "@/components/ui/item";
import { useEffect, useState } from "react";
import Aurora from "@/components/Aurora";
import { useUser } from "@/lib/supabase/get_client";
import { Skeleton } from "@/components/ui/skeleton"

export default function Page () {

  const [isVisible, setIsVisible] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, 50)           // ← 0–100ms is usually perfect

    return () => clearTimeout(timer)
  }, [])
  const { user, loading } = useUser()

  return (<>
  <div className="relative min-h-[100dvh]  animate-in overflow-clip">
    <div className={`absolute inset-0 z-0 pointer-events-none rotate-180 
        transition-opacity duration-700 ease-out
        ${isVisible ? 'opacity-70' : 'opacity-0'}`}>
      <Aurora
        colorStops={["#b31237","#b312a0","#5227FF"]}
        blend={0.5}
        amplitude={0.2}
        speed={1.6}/>
    </div>
    <div className="relative px-4 pt-4 z-10 grid grid-rows-[auto_auto_1fr] min-h-[100dvh]">
      <h1 className="scroll-m-20 text-5xl font-extrabold tracking-tight text-balance font-mono">
        BlitzCode
      </h1>
      <p className="leading-7 [&:not(:first-child)]:pt-2.5 dark:text-neutral-200 text-xl">
        Challenge your coding skills in 1v1 Battles.
      </p>
      <div className="self-end pb-14">
        { loading ?
        <Item variant={"outline"} className="backdrop-blur-md bg-neutral-50/5">
          <ItemContent>
            <Skeleton className="h-9 w-26"></Skeleton>
          </ItemContent>
          <ItemActions>
            <Skeleton className="h-9 w-20"></Skeleton>
          </ItemActions>
        </Item> :
        <Item variant={"outline"} className="backdrop-blur-md bg-neutral-50/5">
          <ItemContent>
            <ItemTitle>{user ? `Hi, ${user?.user_metadata.name}`: "Get started"}</ItemTitle>
          </ItemContent>
          <ItemActions>
            <Button asChild >
              {user ? <Link href="/main">Play</Link> : <Link href="/login">Sign up</Link>}
            </Button>
          </ItemActions>
        </Item>}
        
      </div>
    </div>
    
  </div>
  
  </>);
}