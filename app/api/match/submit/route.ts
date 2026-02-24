import { NextResponse } from "next/server";
import { getMatch, getProblem, applyCorrectSubmit } from "@/app/actions";

type InputOutput = { inputs?: unknown[]; outputs?: unknown[] };

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { matchId, userId, code } = body as { matchId?: string; userId?: string; code?: string };
    if (!matchId || !userId || typeof code !== "string") {
      return NextResponse.json(
        { error: "matchId, userId, and code are required" },
        { status: 400 }
      );
    }

    const { match, error: matchErr } = await getMatch(matchId);
    if (matchErr || !match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }
    if (match.status !== "active") {
      return NextResponse.json({ error: "Match is not active" }, { status: 400 });
    }
    if (match.player1_id !== userId && match.player2_id !== userId) {
      return NextResponse.json({ error: "Not a player in this match" }, { status: 403 });
    }
    if (!match.current_problem_id) {
      return NextResponse.json({ error: "No current problem" }, { status: 400 });
    }

    const { problem, error: problemErr } = await getProblem(match.current_problem_id);
    if (problemErr || !problem) {
      return NextResponse.json({ error: "Problem not found" }, { status: 404 });
    }

    let inputOutput: InputOutput = {};
    try {
      inputOutput = typeof problem.input_output === "string"
        ? (JSON.parse(problem.input_output) as InputOutput)
        : problem.input_output;
    } catch {
      return NextResponse.json({ error: "Invalid problem input_output" }, { status: 500 });
    }
    const inputs = inputOutput.inputs ?? [];
    const outputs = inputOutput.outputs ?? [];

    const judgeUrl = process.env.JUDGE_URL;
    if (!judgeUrl) {
      return NextResponse.json({ error: "Judge not configured" }, { status: 500 });
    }

    const judgeRes = await fetch(`${judgeUrl}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, inputs, outputs }),
    });
    const judgeResult = await judgeRes.json().catch(() => ({}));
    const passed = Boolean(judgeResult.passed ?? judgeResult.ok ?? judgeResult.success);

    if (!passed) {
      return NextResponse.json({
        correct: false,
        judgeResult,
      });
    }

    const { match: updatedMatch, error: updateErr } = await applyCorrectSubmit(matchId, userId);
    if (updateErr) {
      return NextResponse.json({ error: "Failed to update match", correct: true }, { status: 500 });
    }

    return NextResponse.json({
      correct: true,
      match: updatedMatch,
      judgeResult,
    });
  } catch (e) {
    console.error("match submit error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
