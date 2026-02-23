'use client';
/*import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { scanRooms, connectToRoom, createNewRoom } from "@/app/actions"
import Image from "next/image";*/
import { useUser } from "@/lib/supabase/get_client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { Spinner } from "@/components/ui/spinner";
import { EllipsisVertical, LogOutIcon, UserRound } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { supabaseBrowser } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useEffect, useState } from 'react'
import { createNewRoom, addDebugPlayer, connectToRoom } from "@/app/actions";
import Image from "next/image";


  


export default function Page () {
  const [roomId, setRoomId] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('idle')
  useEffect(() => {
    if (!roomId) return

  // Subscribe
  const channel = supabaseBrowser
    .channel(`id:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'rooms',
        filter: `id=eq.${roomId}`,
      },
      payload => {
        setStatus(payload.new.status)
      }
    )
    .subscribe()
    // Cleanup
    return () => {
      supabaseBrowser.removeChannel(channel)
    }
  }, [roomId])

  const router = useRouter();

  async function signOut() {
    await supabaseBrowser.auth.signOut()
    router.replace('/')
  }
  const { user, loading } = useUser()
  if (loading) {
    return (<>
    <div className="w-screen min-h-[100dvh] justify-center items-center flex">
      <Spinner className="size-8" />
    </div>
    </>)
  }
  function toMain() {
    router.replace('/')
  }
  if (!user) {
    return (<>
    <div className='min-h-[100dvh] w-screen justify-center items-center flex px-3'>
      <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>You're not logged in</CardTitle>
      </CardHeader>
      <CardContent>
        <Button variant="outline" className="w-full" onClick={toMain}>
          To main page
        </Button>
      </CardContent>
    </Card>
    </div>
    </>)}
  
      console.log(user)
  async function createRoom () {
    console.log("creating...")
    const {roomId, error} = await createNewRoom(user)
    console.log(`Room id :${roomId}`)
    console.log(error)
    setRoomId(roomId)
  }
  async function imitatePlayer () {
    const {room, error} = await addDebugPlayer()
    console.log(room, error)
  }
  async function joinRoom() {
    const {room, error} = await connectToRoom(user)
    console.log(room, error)
  }
  return (<>
  <div className="w-screen min-h-[100dvh]">
    {/* Player info on top */}
    <div className="flex w-full max-w-lg flex-col gap-6 p-3"> 
    <Item variant="outline">
      <ItemMedia>
        <Avatar className="size-10">
          <Image src={user?.user_metadata.avatar_url} alt="Profile picture" height={50} width={50} className="rounded-full"/>
          <AvatarFallback></AvatarFallback>
        </Avatar>
      </ItemMedia>
      <ItemContent>
        <ItemTitle>{user?.user_metadata.name}</ItemTitle>
        {/*<ItemDescription>{date?.toLocaleString()}</ItemDescription>*/}
      </ItemContent>
      <ItemActions>
        <DropdownMenu >
          <DropdownMenuTrigger asChild>
            <Button
              size="icon-sm"
              variant="outline"
              aria-label="Profile settings"
            >
              <EllipsisVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-40" align="end" >
            <DropdownMenuGroup>
              <DropdownMenuItem><UserRound />Profile</DropdownMenuItem>
            </DropdownMenuGroup >
            <DropdownMenuSeparator />
            <DropdownMenuItem  variant="destructive" onClick={signOut}><LogOutIcon />Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
      </ItemActions>
    </Item>
    </div>
    {/* Matchmaking UI */}
    <div>
      <p>Matchmake</p>
      <Button onClick={createRoom}>Create new room</Button>
      <p>Status: {status}</p>
      <Button onClick={imitatePlayer}>Imitate 2 player join</Button>
      <Button onClick={joinRoom}>Connect to available room</Button>
    </div>
  </div>
  </>
)
}









/*
'use client'




  return status
}
    const [matchmakingText, setMatchmakingText] = useState("Start Matchmaking");
    async function handleStart() {
        setMatchmakingText("Finding game...")
        if (session) {
            const roomsAmount = await scanRooms(session.user)
            if (roomsAmount) {
                if (roomsAmount > 0) {
                    setMatchmakingText(`Found ${roomsAmount} room`)
                    const connectRes = await connectToRoom(session.user)
                } else if (roomsAmount === 0) {
                    setMatchmakingText("Creating a new room...")
                    
                }
                
            }
        }
    }

    return (<>
    <div className="pt-10 px-4 grid w-full gap-2 md:max-w-sm">
        {session?.user.image && (<Image
            src={session?.user.image}
            alt="Profile picture"
            height={100}
            width={100}
            className="rounded-full">
        </Image>)}
        
        <p>{session?.user.name}</p>
        <Button variant="secondary" onClick={handleStart}>{matchmakingText}</Button>
        
    </div>
    </>)
}
    */