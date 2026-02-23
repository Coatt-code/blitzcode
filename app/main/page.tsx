'use client';

import { useUser } from "@/lib/supabase/get_client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Spinner } from "@/components/ui/spinner";
import { EllipsisVertical, LogOutIcon, UserRound } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  createNewRoom,
  connectToRoom,
  scanRooms,
  cancelSearch,
} from "@/app/actions";
import Image from "next/image";
import { LoaderIcon, Swords } from "lucide-react";
import { cn } from "@/lib/utils";

type Status = "idle" | "searching" | "found";

const SEARCH_DEBOUNCE_MS = 400;

export default function Page() {
  const router = useRouter();
  const { user, loading } = useUser();
  const [roomId, setRoomId] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [freeRooms, setFreeRooms] = useState(0);
  const [canceledByOpponent, setCanceledByOpponent] = useState(false);
  const [showMatchFoundDialog, setShowMatchFoundDialog] = useState(true);
  const searchInProgressRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const weCanceledRef = useRef(false);

  // One-time scan on load to decide create vs join (no polling; rest is realtime)
  useEffect(() => {
    if (!user) return;
    let mounted = true;
    scanRooms(user).then((n) => {
      if (mounted && typeof n === "number") setFreeRooms(n);
    });
    return () => {
      mounted = false;
    };
  }, [user]);

  // Realtime: subscribe to our room for match found or canceled
  useEffect(() => {
    if (!roomId || !user) return;
    const channel = supabaseBrowser
      .channel(`room:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          const newState = (payload.new as { room_state?: string })?.room_state;
          if (newState === "canceled") {
            setStatus("idle");
            setRoomId(null);
            if (!weCanceledRef.current) setCanceledByOpponent(true);
            weCanceledRef.current = false;
          } else if (newState !== "searching") {
            setStatus("found");
            setShowMatchFoundDialog(true);
          }
        }
      )
      .subscribe();
    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, [roomId, user]);

  const runSearch = useCallback(async () => {
    if (!user || searchInProgressRef.current) return;
    searchInProgressRef.current = true;
    setCanceledByOpponent(false);
    setStatus("searching");

    try {
      const { room, error: joinError } = await connectToRoom(user);
      if (room?.id) {
        setRoomId(room.id);
        setStatus("found");
        setShowMatchFoundDialog(true);
        searchInProgressRef.current = false;
        return;
      }
      const { roomId: newRoomId, error: createError } = await createNewRoom(user);
      if (newRoomId) {
        setRoomId(newRoomId);
        // stay in 'searching' until realtime UPDATE (someone joined) or canceled
      } else {
        setStatus("idle");
        setRoomId(null);
      }
    } finally {
      searchInProgressRef.current = false;
    }
  }, [user]);

  const startMatchmaking = useCallback(() => {
    if (status === "searching") return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      runSearch();
    }, SEARCH_DEBOUNCE_MS);
  }, [status, runSearch]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleCancelSearch = useCallback(async () => {
    if (roomId && user) {
      weCanceledRef.current = true;
      await cancelSearch(roomId, user.id);
    }
    setStatus("idle");
    setRoomId(null);
    setCanceledByOpponent(false);
  }, [roomId, user]);

  const goToPreparation = useCallback(() => {
    if (roomId) router.push(`/match/${roomId}/prepare`);
  }, [roomId, router]);

  const onDialogOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        if (status === "searching") handleCancelSearch();
        else if (status === "found") setShowMatchFoundDialog(false);
      }
    },
    [status, handleCancelSearch]
  );

  async function signOut() {
    await supabaseBrowser.auth.signOut();
    router.replace("/");
  }

  function toMain() {
    router.replace("/");
  }

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] w-screen items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[100dvh] w-screen items-center justify-center px-3">
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
    );
  }

  const dialogOpen =
    status === "searching" || (status === "found" && showMatchFoundDialog);

  return (
    <div className="flex h-[100dvh] w-screen flex-col">
      <div className="flex w-full max-w-lg flex-col gap-6 p-3">
        <Item variant="outline">
          <ItemMedia>
            <Avatar className="size-10">
              <Image
                src={user?.user_metadata?.avatar_url ?? ""}
                alt="Profile"
                height={50}
                width={50}
                className="rounded-full"
              />
              <AvatarFallback />
            </Avatar>
          </ItemMedia>
          <ItemContent>
            <ItemTitle>{user?.user_metadata?.name ?? "Player"}</ItemTitle>
          </ItemContent>
          <ItemActions>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon-sm"
                  variant="outline"
                  aria-label="Profile settings"
                >
                  <EllipsisVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-40" align="end">
                <DropdownMenuGroup>
                  <DropdownMenuItem>
                    <UserRound /> Profile
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={signOut}
                >
                  <LogOutIcon /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </ItemActions>
        </Item>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-auto pb-20">
        <div className="grid w-64 grid-cols-2 grid-rows-2 gap-4 aspect-square">
          <Button
            className="aspect-square h-full w-full"
            size="lg"
            variant="outline"
          />
          <Button
            className="aspect-square h-full w-full"
            size="lg"
            variant="outline"
          />
          <Button
            className="aspect-square h-full w-full"
            size="lg"
            variant="outline"
          />
          <Button
            className="aspect-square h-full w-full"
            size="lg"
            variant="secondary"
            onClick={startMatchmaking}
            disabled={status === "searching"}
          >
            {status === "idle" && "Ranked mode"}
            {status === "searching" && "Searching…"}
            {status === "found" && "Match found"}
          </Button>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={onDialogOpenChange}>
        <DialogContent showCloseButton={false}>
          {status === "searching" && (
            <>
              <DialogHeader>
                <div className="flex gap-2">
                  <LoaderIcon
                    role="status"
                    aria-label="Loading"
                    className={cn("size-4 animate-spin mt-px")}
                  />
                  <DialogTitle>Searching for opponent</DialogTitle>
                </div>
                <DialogDescription className="mt-3 mb-2">
                  Waiting for another player… 1/2
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="destructive">
                    Cancel search
                  </Button>
                </DialogClose>
              </DialogFooter>
            </>
          )}
          {status === "found" && (
            <>
              <DialogHeader>
                <div className="flex gap-2">
                  <Swords className="size-5 text-primary" />
                  <DialogTitle>Match found</DialogTitle>
                </div>
                <DialogDescription className="mt-3 mb-2">
                  Your opponent is ready. Go to preparation to see who you're facing.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button type="button" onClick={goToPreparation}>
                  View opponent
                </Button>
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Stay
                  </Button>
                </DialogClose>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {canceledByOpponent && (
        <div className="fixed bottom-4 left-4 right-4 mx-auto max-w-sm rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
          Match was canceled by the other player.
        </div>
      )}
    </div>
  );
}
