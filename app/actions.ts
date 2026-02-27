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

// --- Matches (started games) ---

export type MatchRow = {
  id: string
  room_id: string
  player1_id: string
  player2_id: string
  status: string
  winner_id: string | null
  started_at: string
  round_started_at: string | null
  round_index: number
  current_problem_id: number | null
  timer_ends_at: string | null
  timer_triggered_by_user_id: string | null
  player1_damage_taken: number[]
  player2_damage_taken: number[]
  updated_at: string
}

/** Get match by id. */
export async function getMatch(matchId: string) {
  const { data: match, error } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single()
  return { match: match as MatchRow | null, error }
}

/** Get match by room_id (for get-or-create on Start game). */
export async function getMatchByRoomId(roomId: string) {
  const { data: match, error } = await supabase
    .from('matches')
    .select('*')
    .eq('room_id', roomId)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return { match: match as MatchRow | null, error }
}

/** Check if user has an active match (either searching, preparing, or in progress). */
export async function getUserActiveMatch(userId: string) {
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('id, room_state, player1_id, player2_id')
    .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
    .in('room_state', ['searching', 'preparing', 'in_progress'])
    .single()

  if (roomError || !room) return { room: null, match: null, error: roomError }

  // If room is in progress, also get the match
  let match = null
  if (room.room_state === 'in_progress') {
    const { match: matchData, error: matchError } = await getMatchByRoomId(room.id)
    match = matchData
  }

  return { room, match, error: null }
}

const DAMAGE_FIRST = 500
const DAMAGE_REDUCED = 350
const TIMER_SECONDS = 60

export async function createMatch(roomId: string, player1Id: string, player2Id: string) {
  // Use `rooms.room_state` as an atomic lock. Only the player who successfully updates it creates the match.
  const { data: updatedRoom, error: updateErr } = await supabase
    .from('rooms')
    .update({ room_state: 'in_progress' })
    .eq('id', roomId)
    .in('room_state', ['searching', 'preparing'])
    .select('id')

  if (updateErr || !updatedRoom || updatedRoom.length === 0) {
    // If we couldn't update, it means someone else already transitioned it (or it's canceled). 
    // Just fetch the existing match and return it.
    const { match: existingMatch } = await getMatchByRoomId(roomId)
    if (existingMatch) {
      return { matchId: existingMatch.id, error: null }
    }
    return { matchId: null as string | null, error: new Error('Room is not in a valid state to start') }
  }
  // Amount of Problems (44-338)
  const problemId = Math.floor(Math.random() * 338) + 44
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .insert({
      room_id: roomId,
      player1_id: player1Id,
      player2_id: player2Id,
      status: 'active',
      round_index: 0,
      current_problem_id: problemId,
      round_started_at: new Date().toISOString(),
      player1_damage_taken: [],
      player2_damage_taken: [],
    })
    .select('id')
    .single()

  if (matchError) return { matchId: null as string | null, error: matchError }
  return { matchId: (match as { id: string }).id, error: null }
}

/** Problem from tests.problems (id 1–473). */
export type ProblemRow = {
  id: number
  question: string
  input_output: string
  starter_code: string | null
}

/** Get problem by id from tests.problems. Uses RPC so we don't need to expose tests schema. */
export async function getProblem(problemId: number) {
  const { data, error } = await supabase.rpc('get_problem', { p_id: problemId })
  const row = data != null ? (Array.isArray(data) ? data[0] : data) : null
  if (!row) return { problem: null as ProblemRow | null, error }

  const r = row as any
  const normalized: ProblemRow = {
    id: Number(r.id),
    question: String(r.question ?? ""),
    input_output: String(r.input_output ?? ""),
    starter_code: (r.starter_code ?? null) as string | null,
  }

  return { problem: normalized, error }
}

/** Apply correct-submit game logic and return updated match (for use in API). */
export async function applyCorrectSubmit(
  matchId: string,
  userId: string,
  now: Date = new Date()
) {
  const { match, error: fetchErr } = await getMatch(matchId)
  if (fetchErr || !match) return { match: null, error: fetchErr }
  const nowIso = now.toISOString()
  const isPlayer1 = match.player1_id === userId
  const opponentId = isPlayer1 ? match.player2_id : match.player1_id
  const timerActive = match.timer_ends_at && new Date(match.timer_ends_at) > now
  const triggeredByOpponent = match.timer_triggered_by_user_id === opponentId

  let nextPlayer1Damage = [...match.player1_damage_taken]
  let nextPlayer2Damage = [...match.player2_damage_taken]
  let timerEndsAt: string | null = null
  let timerTriggeredBy: string | null = null
  let roundIndex = match.round_index
  let currentProblemId = match.current_problem_id
  let status = match.status
  let winnerId: string | null = match.winner_id

  // If no active timer, a correct submit should only START the timer for the opponent.
  // Damage is applied when the timer expires (handled via /api/match/tick).
  if (timerActive && !triggeredByOpponent) {
    return { match, error: null }
  }

  if (!timerActive) {
    timerEndsAt = new Date(now.getTime() + TIMER_SECONDS * 1000).toISOString()
    timerTriggeredBy = userId
  } else if (triggeredByOpponent) {
    const endAt = new Date(match.timer_ends_at!).getTime()
    const left = Math.max(0, (endAt - now.getTime()) / 1000)
    const ratio = left / TIMER_SECONDS
    const damage = Math.round(DAMAGE_REDUCED + (DAMAGE_FIRST - DAMAGE_REDUCED) * (1 - ratio))
    if (isPlayer1) nextPlayer1Damage = [...nextPlayer1Damage, damage]
    else nextPlayer2Damage = [...nextPlayer2Damage, damage]
    const myTotal = (isPlayer1 ? nextPlayer1Damage : nextPlayer2Damage).reduce((a, b) => a + b, 0)
    if (myTotal >= 1000) {
      status = 'finished'
      winnerId = opponentId
    } else {
      roundIndex += 1
      currentProblemId = Math.floor(Math.random() * 473) + 1
      timerEndsAt = null
      timerTriggeredBy = null
    }
  }

  const { data: updated, error: updateErr } = await supabase
    .from('matches')
    .update({
      player1_damage_taken: nextPlayer1Damage,
      player2_damage_taken: nextPlayer2Damage,
      timer_ends_at: timerEndsAt,
      timer_triggered_by_user_id: timerTriggeredBy,
      round_index: roundIndex,
      current_problem_id: currentProblemId,
      round_started_at: roundIndex > match.round_index ? nowIso : match.round_started_at,
      status,
      winner_id: winnerId,
    })
    .eq('id', matchId)
    .select()
    .single()

  if (!updateErr && updated && status === 'finished') {
    await supabase
      .from('rooms')
      .update({ room_state: 'ended' })
      .eq('id', (updated as MatchRow).room_id)
      .eq('room_state', 'in_progress')
  }

  return { match: updated as MatchRow, error: updateErr }
}

/** Apply game logic when a timer expires. */
export async function applyTimerExpired(matchId: string) {
  const { match, error: fetchErr } = await getMatch(matchId)
  if (fetchErr || !match) return { match: null, error: fetchErr }

  if (!match.timer_ends_at || !match.timer_triggered_by_user_id) {
    return { match, error: null }
  }

  const triggeringUser = match.timer_triggered_by_user_id
  const isPlayer1 = match.player1_id === triggeringUser
  const victimId = isPlayer1 ? match.player2_id : match.player1_id

  let nextPlayer1Damage = [...match.player1_damage_taken]
  let nextPlayer2Damage = [...match.player2_damage_taken]
  let roundIndex = match.round_index
  let currentProblemId = match.current_problem_id
  let status = match.status
  let winnerId: string | null = match.winner_id

  const damage = DAMAGE_FIRST

  if (isPlayer1) {
    nextPlayer2Damage = [...nextPlayer2Damage, damage]
  } else {
    nextPlayer1Damage = [...nextPlayer1Damage, damage]
  }

  const victimTotalDamage = (isPlayer1 ? nextPlayer2Damage : nextPlayer1Damage).reduce((a, b) => a + b, 0)

  if (victimTotalDamage >= 1000) {
    status = 'finished'
    winnerId = triggeringUser
  } else {
    roundIndex += 1
    currentProblemId = Math.floor(Math.random() * 473) + 1
  }

  const { data: updated, error: updateErr } = await supabase
    .from('matches')
    .update({
      player1_damage_taken: nextPlayer1Damage,
      player2_damage_taken: nextPlayer2Damage,
      timer_ends_at: null,
      timer_triggered_by_user_id: null,
      round_index: roundIndex,
      current_problem_id: currentProblemId,
      round_started_at: new Date().toISOString(),
      status,
      winner_id: winnerId,
    })
    .eq('id', matchId)
    .select()
    .single()

  if (!updateErr && updated && status === 'finished') {
    await supabase
      .from('rooms')
      .update({ room_state: 'ended' })
      .eq('id', (updated as MatchRow).room_id)
      .eq('room_state', 'in_progress')
  }

  return { match: updated as MatchRow, error: updateErr }
}