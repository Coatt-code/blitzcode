"use client";
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { scanRooms } from "@/app/actions"
import { useSession } from "next-auth/react";
import Image from "next/image";


export default function Page () {
    const { data: session, status } = useSession()
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
        <Button variant="secondary" onClick={scanRooms}>Start Matchmaking</Button>
        
    </div>
    </>)
}