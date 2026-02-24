import { NextResponse } from "next/server";
import { getMatch, applyTimerExpired } from "@/app/actions";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { matchId, userId } = body as { matchId?: string; userId?: string };

    if (!matchId || !userId) {
      return NextResponse.json({ error: "matchId and userId are required" }, { status: 400 });
    }

    const { match, error: matchErr } = await getMatch(matchId);
    if (matchErr || !match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    if (match.player1_id !== userId && match.player2_id !== userId) {
      return NextResponse.json({ error: "Not a player in this match" }, { status: 403 });
    }

    if (!match.timer_ends_at || !match.timer_triggered_by_user_id) {
      return NextResponse.json({ ok: true, applied: false, reason: "no_timer" });
    }

    const endsAt = new Date(match.timer_ends_at);
    if (endsAt > new Date()) {
      return NextResponse.json({ ok: true, applied: false, reason: "not_expired" });
    }

    const { match: updatedMatch, error: applyErr } = await applyTimerExpired(matchId);
    if (applyErr) {
      return NextResponse.json({ error: "Failed to apply timer expiry", details: applyErr }, { status: 500 });
    }

    return NextResponse.json({ ok: true, applied: true, match: updatedMatch });
  } catch (e) {
    console.error("match tick error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
