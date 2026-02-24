"use client";

import { useParams, useRouter } from "next/navigation";
import { useUser } from "@/lib/supabase/get_client";
import { supabaseBrowser } from "@/lib/supabase/client";
import { getRoom, getProfile, getMatchByRoomId, createMatch, type Profile } from "@/app/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Swords, UserRound } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

type RoomRow = {
  id: string;
  room_state: string;
  player1_id: string;
  player2_id: string | null;
};

export default function PreparePage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const roomId = typeof params.id === "string" ? params.id : null;
  const [room, setRoom] = useState<RoomRow | null>(null);
  const [opponentProfile, setOpponentProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const loadRoom = useCallback(async () => {
    if (!roomId) return;
    setLoading(true);
    setError(null);
    const { room: r, error: e } = await getRoom(roomId);
    setLoading(false);
    if (e) {
      setError("Room not found");
      return;
    }
    if (r) setRoom(r as RoomRow);
  }, [roomId]);

  useEffect(() => {
    loadRoom();
  }, [loadRoom]);

  // Load opponent profile from public.profiles when we have opponent id
  useEffect(() => {
    if (!room) return;
    const opponentId = room.player1_id === user?.id ? room.player2_id : room.player1_id;
    if (!opponentId || !user) return;
    getProfile(opponentId).then(({ profile }) => {
      if (profile) setOpponentProfile(profile);
    });
  }, [room, user?.id]);

  const isPlayer1 = room?.player1_id === user?.id;
  const opponentId = isPlayer1 ? room?.player2_id : room?.player1_id;
  const hasOpponent = !!opponentId;

  // Initialize countdown when opponent joins
  useEffect(() => {
    if (hasOpponent && countdown === null && room?.room_state !== 'in_progress' && room?.room_state !== 'started') {
      setCountdown(5);
    }
  }, [hasOpponent, countdown, room?.room_state]);

  // Handle countdown tick
  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c !== null ? c - 1 : null), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Handle match creation polling when countdown hits 0
  useEffect(() => {
    if (countdown === 0 && room?.id && room?.player1_id && room?.player2_id) {
      let isMounted = true;
      setStarting(true);
      const attemptStart = async () => {
        if (!isMounted) return;
        try {
          const { match: existing } = await getMatchByRoomId(roomId!);
          if (existing) {
            router.replace(`/match/${existing.id}`);
            return;
          }
          const { matchId } = await createMatch(
            room.id,
            room.player1_id,
            room.player2_id as string
          );
          if (matchId) {
            router.replace(`/match/${matchId}`);
            return;
          }
        } catch (e) {
          console.error(e);
        }
        if (isMounted) {
          setTimeout(attemptStart, 1500); // 1.5s poll delay prevents spam
        }
      };

      attemptStart();
      return () => { isMounted = false; };
    }
  }, [countdown, roomId, room?.id, room?.player1_id, room?.player2_id, router]);

  // Realtime: when room state moves to in_progress, fetch match and go to match page
  useEffect(() => {
    if (!roomId || !room) return;
    const channel = supabaseBrowser
      .channel(`room-prepare:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${roomId}`,
        },
        async (payload) => {
          const newState = (payload.new as { room_state?: string })?.room_state;
          setRoom((prev) =>
            prev
              ? { ...prev, ...(payload.new as Partial<RoomRow>) }
              : (payload.new as RoomRow)
          );
          if (newState === "in_progress" || newState === "started") {
            const { match } = await getMatchByRoomId(roomId as string);
            if (match) router.replace(`/match/${match.id}`);
          }
        }
      )
      .subscribe();
    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, [roomId, room, router]);

  if (userLoading) {
    return (
      <div className="flex min-h-[100dvh] w-screen items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (!user) {
    router.replace("/login");
    return null;
  }

  if (!roomId) {
    router.replace("/main");
    return null;
  }

  if (loading && !room) {
    return (
      <div className="flex min-h-[100dvh] w-screen items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="flex min-h-[100dvh] w-screen flex-col items-center justify-center gap-4 px-4">
        <p className="text-muted-foreground">{error ?? "Room not found"}</p>
        <Button variant="outline" onClick={() => router.push("/main")}>
          Back to lobby
        </Button>
      </div>
    );
  }

  // Ensure types

  return (
    <div className="flex min-h-[100dvh] w-screen flex-col items-center justify-center gap-8 p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Swords className="size-5" />
        <span className="text-sm font-medium">Preparation</span>
      </div>

      <div className="grid w-full max-w-md grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">You</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-2">
            <Avatar className="size-16">
              <Image
                src={user?.user_metadata?.avatar_url ?? ""}
                alt="You"
                width={64}
                height={64}
                className="rounded-full"
              />
              <AvatarFallback>
                <UserRound className="size-8" />
              </AvatarFallback>
            </Avatar>
            <p className="text-sm font-medium">
              {user?.user_metadata?.name ?? "Player"}
            </p>
          </CardContent>
        </Card>

        <Card className={!hasOpponent ? "opacity-70" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Opponent</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-2">
            {hasOpponent ? (
              <>
                <Avatar className="size-16">
                  {opponentProfile?.avatar_url ? (
                    <AvatarImage
                      src={opponentProfile.avatar_url}
                      alt={opponentProfile.name ?? "Opponent"}
                    />
                  ) : null}
                  <AvatarFallback>
                    <UserRound className="size-8" />
                  </AvatarFallback>
                </Avatar>
                <p className="text-sm font-medium">
                  {opponentProfile?.name ?? "Opponent"}
                </p>
              </>
            ) : (
              <>
                <Avatar className="size-16">
                  <AvatarFallback className="animate-pulse">
                    <span className="text-xs">?</span>
                  </AvatarFallback>
                </Avatar>
                <p className="text-sm text-muted-foreground">Waiting…</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-base">Match ready</CardTitle>
          <CardDescription>
            {hasOpponent && countdown !== null
              ? `Game starting in ${countdown}...`
              : hasOpponent
                ? "Preparing match..."
                : "Waiting for opponent to join..."}
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
