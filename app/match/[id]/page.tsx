"use client";

import { useParams, useRouter } from "next/navigation";
import { useUser } from "@/lib/supabase/get_client";
import { supabaseBrowser } from "@/lib/supabase/client";
import { getMatch, getProblem, type MatchRow, type ProblemRow } from "@/app/actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useState, useCallback, useEffect } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";
import OutputDisplay from "@/components/ui/output-display";
import { AppWindowIcon, CodeIcon, SquareTerminal } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

const HP_MAX = 1000;

function hpFromDamage(damage: number[]) {
  const total = damage.reduce((a, b) => a + b, 0);
  return Math.max(0, HP_MAX - total);
}

export default function MatchPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const matchId = typeof params.id === "string" ? params.id : null;
  const [match, setMatch] = useState<MatchRow | null>(null);
  const [problem, setProblem] = useState<ProblemRow | null>(null);
  const [code, setCode] = useState("# write your solution\n");
  const [tab, setTab] = useState("editor");
  const [loading, setLoading] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    correct?: boolean;
    judgeResult?: unknown;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadMatch = useCallback(async () => {
    if (!matchId) return;
    const { match: m, error: e } = await getMatch(matchId);
    if (e) {
      setError("Match not found");
      return;
    }
    if (m) setMatch(m);
  }, [matchId]);

  useEffect(() => {
    loadMatch();
  }, [loadMatch]);

  useEffect(() => {
    if (!match?.current_problem_id) return;
    getProblem(match.current_problem_id).then(({ problem: p }) => {
      if (p) setProblem(p);
    });
  }, [match?.current_problem_id]);

  useEffect(() => {
    if (!matchId) return;
    const channel = supabaseBrowser
      .channel(`match:${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "matches",
          filter: `id=eq.${matchId}`,
        },
        (payload) => {
          setMatch((payload.new as MatchRow) ?? null);
        }
      )
      .subscribe();
    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, [matchId]);

  if (userLoading) {
    return (
      <div className="flex min-h-screen w-screen items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }
  if (!user) {
    router.replace("/login");
    return null;
  }
  if (!matchId) {
    router.replace("/main");
    return null;
  }
  if (error || !match) {
    return (
      <div className="flex min-h-screen w-screen flex-col items-center justify-center gap-4 px-4">
        <p className="text-muted-foreground">{error ?? "Match not found"}</p>
        <Button variant="outline" onClick={() => router.push("/main")}>
          Back to lobby
        </Button>
      </div>
    );
  }
  if (match.player1_id !== user.id && match.player2_id !== user.id) {
    return (
      <div className="flex min-h-screen w-screen flex-col items-center justify-center gap-4 px-4">
        <p className="text-muted-foreground">You are not in this match.</p>
        <Button variant="outline" onClick={() => router.push("/main")}>
          Back to lobby
        </Button>
      </div>
    );
  }

  const isPlayer1 = match.player1_id === user.id;
  const myHp = hpFromDamage(isPlayer1 ? match.player1_damage_taken : match.player2_damage_taken);
  const oppHp = hpFromDamage(isPlayer1 ? match.player2_damage_taken : match.player1_damage_taken);
  const timerEndsAt = match.timer_ends_at ? new Date(match.timer_ends_at) : null;
  const timerActive = timerEndsAt && timerEndsAt > new Date();
  const iTriggeredTimer = match.timer_triggered_by_user_id === user.id;

  async function submitCode() {
    if (!matchId || !user) return;
    setTab("output");
    setLoading(true);
    setSubmitResult(null);
    try {
      const res = await fetch("/api/match/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, userId: user.id, code }),
      });
      const data = await res.json();
      setSubmitResult({
        correct: data.correct,
        judgeResult: data.judgeResult,
      });
      if (data.match) setMatch(data.match);
    } catch (e) {
      setSubmitResult({ correct: false, judgeResult: { error: "Request failed" } });
    } finally {
      setLoading(false);
    }
  }

  const finished = match.status === "finished";
  const winner = match.winner_id === user.id;

  if (finished) {
    return (
      <div className="flex min-h-screen w-screen flex-col items-center justify-center gap-6 p-4">
        <h1 className="text-2xl font-bold">{winner ? "You win!" : "You lost."}</h1>
        <div className="flex gap-8">
          <div className="text-center">
            <p className="text-muted-foreground text-sm">You</p>
            <p className="text-lg font-mono">{myHp} HP</p>
          </div>
          <div className="text-center">
            <p className="text-muted-foreground text-sm">Opponent</p>
            <p className="text-lg font-mono">{oppHp} HP</p>
          </div>
        </div>
        <Button onClick={() => router.push("/main")}>Back to lobby</Button>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] w-screen flex-col">
      {/* HP and timer */}
      <div className="flex shrink-0 items-center justify-between gap-4 border-b px-4 py-2">
        <div className="flex flex-1 flex-col gap-1">
          <p className="text-muted-foreground text-xs">You</p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-green-600 transition-all"
              style={{ width: `${(myHp / HP_MAX) * 100}%` }}
            />
          </div>
          <p className="font-mono text-xs">{myHp} / {HP_MAX}</p>
        </div>
        {timerActive && (
          <div className="shrink-0 text-center">
            <p className="text-muted-foreground text-xs">
              {iTriggeredTimer ? "Opponent has 1 min" : "You have 1 min"}
            </p>
            <TimerCountdown endsAt={timerEndsAt!} />
          </div>
        )}
        <div className="flex flex-1 flex-col gap-1 text-right">
          <p className="text-muted-foreground text-xs">Opponent</p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-red-600 transition-all"
              style={{ width: `${(oppHp / HP_MAX) * 100}%` }}
            />
          </div>
          <p className="font-mono text-xs">{oppHp} / {HP_MAX}</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <Tabs className="flex h-full flex-col" value={tab} onValueChange={setTab}>
          <TabsList className="shrink-0">
            <TabsTrigger value="problem"><AppWindowIcon /> Problem</TabsTrigger>
            <TabsTrigger value="editor"><CodeIcon /> Code</TabsTrigger>
            <TabsTrigger value="output"><SquareTerminal /> Output</TabsTrigger>
          </TabsList>
          <TabsContent value="problem" className="flex-1 overflow-auto p-4">
            {problem ? (
              <div className="prose dark:prose-invert max-w-none">
                <h2 className="text-lg font-semibold">Problem {problem.id}</h2>
                <p className="whitespace-pre-wrap">{problem.question}</p>
              </div>
            ) : (
              <p className="text-muted-foreground">Loading problem…</p>
            )}
          </TabsContent>
          <TabsContent value="editor" className="mt-0 flex-1 overflow-hidden">
            <CodeMirror
              className="h-full w-full"
              value={code}
              onChange={setCode}
              theme={oneDark}
              extensions={[python()]}
              basicSetup={{
                lineNumbers: true,
                highlightActiveLine: true,
                foldGutter: true,
              }}
            />
          </TabsContent>
          <TabsContent value="output" className="mt-0 flex-1 overflow-auto p-4">
            <OutputDisplay
              result={
                submitResult?.correct === true
                  ? { stdout: "Correct! Damage applied." }
                  : submitResult?.correct === false
                    ? { stdout: "Wrong answer or error.",/* stderr: JSON.stringify(submitResult.judgeResult)*/ }
                    : undefined
              }
              loading={loading}
            />
          </TabsContent>
        </Tabs>
        <Button
          className="fixed bottom-5 right-6"
          variant="outline"
          onClick={submitCode}
          disabled={loading || finished}
        >
          Submit
        </Button>
      </div>
    </div>
  );
}

function TimerCountdown({ endsAt }: { endsAt: Date }) {
  const [left, setLeft] = useState(() => Math.max(0, Math.ceil((endsAt.getTime() - Date.now()) / 1000)));
  useEffect(() => {
    const t = setInterval(() => {
      const s = Math.max(0, Math.ceil((endsAt.getTime() - Date.now()) / 1000));
      setLeft(s);
      if (s <= 0) clearInterval(t);
    }, 200);
    return () => clearInterval(t);
  }, [endsAt]);
  return <p className="font-mono font-semibold">{left}s</p>;
}
