"use server";
import { createClient } from '@supabase/supabase-js'
import { User } from './types/user';
import { randomUUID } from 'crypto';
const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SECRET_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)



export async function scanRooms(user: User) {
    const { data: rooms, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('room_state', 'searching')
    .neq('player1_id', user.id)    // check if room creator is not self
    if (Array.isArray(rooms)) {
        return rooms.length
    }
}

export async function createNewRoom(user: User) {
    const { data: room, error } = await supabase
    .from('rooms')
    .upsert(
        {
        room_state: 'searching',
        player1_id: user.id,
        }
    )
    .select('id')
    .single()

    const roomId = room?.id
    return { roomId, error }
}

export async function addDebugPlayer() {
    const debugUUID = randomUUID()
    const { data: room, error } = await supabase
    .rpc('join_searching_room', { p_user_id: debugUUID })


    /*    const { data: room, error } = await supabase
    .from('rooms')
    .update({
    room_state: 'preparing',
    player2_id: debugUUID,
    })
    .eq('room_state', 'searching')
    .neq('player1_id', debugUUID)
    .is('player2_id', null) // 👈 important safety check
    .select()
    .limit(1)
    .single()
*/
return { room, error }
}

export async function connectToRoom(user: User) {
  const { data: room, error } = await supabase
  .rpc('join_searching_room', { p_user_id: user.id })

return { room, error }
}