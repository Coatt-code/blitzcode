import { NextResponse } from "next/server";
import { applyCorrectSubmit, getMatch, getProblem } from "@/app/actions";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { matchId, userId, code } = body as {
      matchId?: string;
      userId?: string;
      code?: string;
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

    let tests: Array<{ input: string[]; expected: string; fn_name: string }> = [];
    try {
      const io = JSON.parse(problem.input_output);
      const inputs: unknown = io?.inputs;
      const outputs: unknown = io?.outputs;
      const fnName: unknown = io?.fn_name;

      if (!Array.isArray(inputs) || !Array.isArray(outputs) || typeof fnName !== "string") {
        tests = [];
      } else {
        const maxLen = Math.max(inputs.length, outputs.length);
        for (let i = 0; i < maxLen; i++) {
          const inp = inputs[i];
          const out = outputs[i];

          tests.push({
            input: Array.isArray(inp) ? (inp as string[]) : [],
            expected: Array.isArray(out) && typeof out[0] === "string" ? (out[0] as string) : "",
            fn_name: fnName,
          });
        }
      }
    } catch {
      tests = [];
    }

    const judgeUrl = process.env.JUDGE_URL;
    if (!judgeUrl) {
      return NextResponse.json({ error: "Judge not configured" }, { status: 500 });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    let judgeRes: Response;
    try {
      judgeRes = await fetch(`${judgeUrl}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, tests }),
        signal: controller.signal,
      });
    } catch (err: any) {
      if (err?.name === "AbortError") {
        return NextResponse.json(
          { error: "Judge request timed out" },
          { status: 504 }
        );
      }
      return NextResponse.json(
        { error: "Failed to reach judge", details: String(err?.message ?? err) },
        { status: 502 }
      );
    } finally {
      clearTimeout(timeoutId);
    }

    const judgeResult = await judgeRes.json().catch(() => ({}));
    const passed = Boolean(judgeResult?.passed);

    if (!passed) {
      return NextResponse.json({
        correct: false,
        judgeResult,
      });
    }

    const { match: updatedMatch, error: updateErr } = await applyCorrectSubmit(
      matchId,
      userId
    );
    if (updateErr || !updatedMatch) {
      return NextResponse.json(
        { error: "Failed to update match", correct: false, judgeResult },
        { status: 500 }
      );
    }

    return NextResponse.json({
      correct: true,
      match: updatedMatch,
      judgeResult,
    });
  } catch (e) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
