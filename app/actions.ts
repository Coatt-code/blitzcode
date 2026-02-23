"use server";
import { createClient } from '@supabase/supabase-js'
import { User } from './types/user';
const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SECRET_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

/** Number of rooms currently searching (excluding current user's). Used once to decide create vs join. */
export async function scanRooms(user: User) {
  const { data: rooms, error } = await supabase
    .from('rooms')
    .select('id')
    .eq('room_state', 'searching')
    .neq('player1_id', user.id)
  if (Array.isArray(rooms)) return rooms.length
  return 0
}

/** Create a new room and return its id. Realtime will notify when someone joins. */
export async function createNewRoom(user: User) {
  const { data: room, error } = await supabase
    .from('rooms')
    .insert({
      room_state: 'searching',
      player1_id: user.id,
    })
    .select('id')
    .single()
  return { roomId: room?.id ?? null, error }
}

/** Join an existing searching room. Returns the room row (with id) or null. */
export async function connectToRoom(user: User) {
  const { data: room, error } = await supabase
    .rpc('join_searching_room', { p_user_id: user.id })
  return { room: room ?? null, error }
}

/** Cancel search: set room to canceled so it disappears from matchmaking. Only creator can cancel. */
export async function cancelSearch(roomId: string, userId: string) {
  const { error } = await supabase
    .from('rooms')
    .update({ room_state: 'canceled' })
    .eq('id', roomId)
    .eq('player1_id', userId)
  return { error }
}

/** Get room by id with player ids. For preparation page. */
export async function getRoom(roomId: string) {
  const { data: room, error } = await supabase
    .from('rooms')
    .select('id, room_state, player1_id, player2_id')
    .eq('id', roomId)
    .single()
  return { room, error }
}

export type Profile = { id: string; name: string | null; avatar_url: string | null }

/** Get a profile by user id from public.profiles. */
export async function getProfile(userId: string) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, name, avatar_url')
    .eq('id', userId)
    .single()
  return { profile: profile as Profile | null, error }
}