import { NextResponse } from "next/server";
import { getMatch, getProblem } from "@/app/actions";

type InputOutput = { inputs?: unknown[]; outputs?: unknown[] };

/** Run code against first N test cases only; does not update the match. */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { matchId, userId, code, limit } = body as {
      matchId?: string;
      userId?: string;
      code?: string;
      limit?: number;
    };
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
      inputOutput =
        typeof problem.input_output === "string"
          ? (JSON.parse(problem.input_output) as InputOutput)
          : problem.input_output;
    } catch {
      return NextResponse.json({ error: "Invalid problem input_output" }, { status: 500 });
    }
    const inputs = (inputOutput.inputs ?? []).map(String);
    const outputs = (inputOutput.outputs ?? []).map(String);

    const judgeUrl = process.env.JUDGE_URL;
    if (!judgeUrl) {
      return NextResponse.json({ error: "Judge not configured" }, { status: 500 });
    }

    const runLimit = typeof limit === "number" && limit >= 0 ? limit : 3;
    const judgeRes = await fetch(`${judgeUrl}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, inputs, outputs, limit: runLimit }),
    });
    const judgeResult = await judgeRes.json().catch(() => ({}));

    return NextResponse.json({ judgeResult });
  } catch (e) {
    console.error("match run error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
