"use client";

import { useParams, useRouter } from "next/navigation";
import { useUser } from "@/lib/supabase/get_client";
import { supabaseBrowser } from "@/lib/supabase/client";
import { getMatch, getProblem, getProfile, type MatchRow, type ProblemRow, type Profile } from "@/app/actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useState, useCallback, useEffect } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";
import OutputDisplay from "@/components/ui/output-display";
import { ProblemContent } from "@/components/problem-content";
import { AppWindowIcon, CodeIcon, SquareTerminal } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { CheckCircle2, XCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const HP_MAX = 1000;

type JudgeResult = {
  results?: Array<{
    index: number;
    test?: string;
    passed?: boolean;
    error?: string;
    expected?: string;
    actual?: string | null;
  }>;
  passed?: boolean;
  error?: string;
  execution_time_ms?: number;
  stderr?: string;
  stdout?: string;
};

function TestResultsView({ judgeResult, showFirstTestDetails = false }: { judgeResult: JudgeResult; showFirstTestDetails?: boolean }) {
  if (judgeResult.error && !judgeResult.results?.length) {
    return (
      <div className="text-destructive">
        {judgeResult.error}
      </div>
    );
  }
  const results = judgeResult.results ?? [];
  const allPassed = judgeResult.passed ?? results.every((r) => r.passed);
  return (
    <div className="space-y-4">
      <p className="font-medium">
        {allPassed ? "All test cases passed." : "Some test cases failed."}
        {judgeResult.execution_time_ms != null && (
          <span className="text-muted-foreground font-normal ml-2">
            ({judgeResult.execution_time_ms} ms)
          </span>
        )}
      </p>
      <div className="space-y-3">
        {results.map((r, index) => (
          <div
            key={r.index}
            className="rounded-lg border p-3 space-y-2 text-sm"
          >
            <div className="flex items-center gap-2">
              {r.passed ? (
                <CheckCircle2 className="size-4 text-green-600 shrink-0" />
              ) : (
                <XCircle className="size-4 text-red-600 shrink-0" />
              )}
              <span className="font-medium">Test case {r.index + 1}</span>
            </div>
            {showFirstTestDetails && index === 0 && (
              <>
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">Test Code</p>
                  <pre className="bg-muted rounded p-2 font-mono text-xs overflow-x-auto whitespace-pre-wrap break-all">
                    {r.test ?? "(none)"}
                  </pre>
                </div>
                {r.error && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">Error</p>
                    <pre className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded p-2 font-mono text-xs overflow-x-auto whitespace-pre-wrap break-all text-red-800 dark:text-red-200">
                      {r.error}
                    </pre>
                  </div>
                )}
                {r.expected !== undefined && r.actual !== undefined && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-muted-foreground text-xs mb-0.5">Expected</p>
                      <pre className="bg-muted rounded p-2 font-mono text-xs overflow-x-auto whitespace-pre-wrap break-all">
                        {r.expected}
                      </pre>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs mb-0.5">Actual</p>
                      <pre className="bg-muted rounded p-2 font-mono text-xs overflow-x-auto whitespace-pre-wrap break-all">
                        {r.actual}
                      </pre>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

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
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [opponentProfile, setOpponentProfile] = useState<Profile | null>(null);
  const [code, setCode] = useState("# write your solution\n");
  const [tab, setTab] = useState("editor");
  const [loading, setLoading] = useState(false);
  const [matchLoading, setMatchLoading] = useState(true);
  const [submitResult, setSubmitResult] = useState<{
    correct?: boolean;
    judgeResult?: unknown;
  } | null>(null);
  const [testResult, setTestResult] = useState<{
    judgeResult?: { results?: Array<{ index: number; input?: string; expected?: string; actual?: string | null; passed?: boolean; error?: string }>; passed?: boolean; error?: string };
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const firstExample = (() => {
    if (!problem?.input_output) return null;
    try {
      const io = JSON.parse(problem.input_output);
      const fnName = typeof io?.fn_name === "string" ? io.fn_name : null;
      const inputs = Array.isArray(io?.inputs) ? io.inputs : [];
      const outputs = Array.isArray(io?.outputs) ? io.outputs : [];
      const firstIn = Array.isArray(inputs?.[0]) ? (inputs[0] as string[]) : null;
      const firstOutArr = Array.isArray(outputs?.[0]) ? (outputs[0] as unknown[]) : null;
      const firstOut = typeof firstOutArr?.[0] === "string" ? (firstOutArr[0] as string) : null;
      if (!firstIn || firstOut == null) return null;
      return { fnName, input: firstIn, output: firstOut };
    } catch {
      return null;
    }
  })();

  const loadMatch = useCallback(async () => {
    if (!matchId) return;
    setMatchLoading(true);
    const { match: m, error: e } = await getMatch(matchId);
    if (e) {
      setError("Match not found");
      setMatchLoading(false);
      return;
    }
    if (m) setMatch(m);
    setMatchLoading(false);
  }, [matchId]);

  const handleTimerExpire = useCallback(async () => {
    if (!matchId || !user) return;
    try {
      const res = await fetch("/api/match/tick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, userId: user.id }),
      });
      const data = await res.json().catch(() => null);
      if (data?.match) {
        setMatch(data.match as MatchRow);
      } else {
        // Fallback: if tick applied but response doesn't include match, reload explicitly.
        await loadMatch();
      }
    } catch { }
  }, [matchId, user, loadMatch]);

  useEffect(() => {
    loadMatch();
  }, [loadMatch]);

  useEffect(() => {
    const endsAt = match?.timer_ends_at ? new Date(match.timer_ends_at) : null;
    if (!endsAt || !matchId || !user) return;
    const remaining = endsAt.getTime() - Date.now();
    if (remaining <= 0) {
      handleTimerExpire();
    }
  }, [match?.timer_ends_at, matchId, user, handleTimerExpire]);

  useEffect(() => {
    if (!match?.current_problem_id) return;
    getProblem(match.current_problem_id).then(({ problem: p }) => {
      if (p) {
        setProblem(p);
        // Always update code when problem changes
        if (p.starter_code) {
          setCode(p.starter_code);
        } else {
          setCode("# write your solution\n");
        }
      }
    });
  }, [match?.current_problem_id]);

  useEffect(() => {
    if (!user?.id) return;
    getProfile(user.id).then(({ profile }) => {
      if (profile) setMyProfile(profile);
    });
  }, [user?.id]);

  useEffect(() => {
    if (!match || !user?.id) return;
    const opponentId = match.player1_id === user.id ? match.player2_id : match.player1_id;
    if (!opponentId) return;
    getProfile(opponentId).then(({ profile }) => {
      if (profile) setOpponentProfile(profile);
    });
  }, [match?.player1_id, match?.player2_id, user?.id]);

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
      <div className="flex min-h-[100dvh] w-screen items-center justify-center">
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
  if (matchLoading) {
    return (
      <div className="flex min-h-[100dvh] w-screen items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }
  if (error || !match) {
    return (
      <div className="flex min-h-[100dvh] w-screen flex-col items-center justify-center gap-4 px-4">
        <p className="text-muted-foreground">{error ?? "Match not found"}</p>
        <Button variant="outline" onClick={() => router.push("/main")}>
          Back to lobby
        </Button>
      </div>
    );
  }
  if (match.player1_id !== user.id && match.player2_id !== user.id) {
    return (
      <div className="flex min-h-[100dvh] w-screen flex-col items-center justify-center gap-4 px-4">
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
    setTestResult(null);
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
    } catch {
      setSubmitResult({ correct: false, judgeResult: { error: "Request failed" } });
    } finally {
      setLoading(false);
    }
  }

  const finished = match.status === "finished";
  const winner = match.winner_id === user.id;

  const myName = myProfile?.name ?? "You";
  const opponentName = opponentProfile?.name ?? "Opponent";

  if (finished) {
    return (
      <div className="flex min-h-[100dvh] w-screen flex-col items-center justify-center gap-6 p-4">
        <h1 className="text-2xl font-bold">{winner ? "You win!" : "You lost."}</h1>
        <div className="flex gap-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <Avatar className="size-8">
                {myProfile?.avatar_url ? (
                  <AvatarImage src={myProfile.avatar_url} alt={myName} />
                ) : null}
                <AvatarFallback>{(myName?.[0] ?? "Y").toUpperCase()}</AvatarFallback>
              </Avatar>
              <p className="text-muted-foreground text-sm">{myName}</p>
            </div>
            <p className="text-lg font-mono">{myHp} HP</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <Avatar className="size-8">
                {opponentProfile?.avatar_url ? (
                  <AvatarImage src={opponentProfile.avatar_url} alt={opponentName} />
                ) : null}
                <AvatarFallback>{(opponentName?.[0] ?? "O").toUpperCase()}</AvatarFallback>
              </Avatar>
              <p className="text-muted-foreground text-sm">{opponentName}</p>
            </div>
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
          <div className="flex items-center gap-2">
            <Avatar className="size-6">
              {myProfile?.avatar_url ? (
                <AvatarImage src={myProfile.avatar_url} alt={myName} />
              ) : null}
              <AvatarFallback>{(myName?.[0] ?? "Y").toUpperCase()}</AvatarFallback>
            </Avatar>
            <p className="text-muted-foreground text-xs">{myName}</p>
          </div>
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
            <TimerCountdown endsAt={timerEndsAt!} onExpire={handleTimerExpire} />
          </div>
        )}
        <div className="flex flex-1 flex-col gap-1 text-right">
          <div className="flex items-center justify-end gap-2">
            <p className="text-muted-foreground text-xs">{opponentName}</p>
            <Avatar className="size-6">
              {opponentProfile?.avatar_url ? (
                <AvatarImage src={opponentProfile.avatar_url} alt={opponentName} />
              ) : null}
              <AvatarFallback>{(opponentName?.[0] ?? "O").toUpperCase()}</AvatarFallback>
            </Avatar>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-red-600 transition-all ml-auto"
              style={{ width: `${(oppHp / HP_MAX) * 100}%` }}
            />
          </div>
          <p className="font-mono text-xs">{oppHp} / {HP_MAX}</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden items-center w-screen">
        <Tabs className="flex h-full flex-col w-full" value={tab} onValueChange={setTab}>
          <TabsList className="shrink-0 mx-auto">
            <TabsTrigger value="problem"><AppWindowIcon /> Problem</TabsTrigger>
            <TabsTrigger value="editor"><CodeIcon /> Code</TabsTrigger>
            <TabsTrigger value="output"><SquareTerminal /> Output</TabsTrigger>
          </TabsList>
          <TabsContent value="problem" className="flex-1 overflow-auto p-4">
            {problem ? (
              <div>
                <h2 className="text-lg font-semibold">Problem {problem.id}</h2>
                <ProblemContent question={problem.question ?? ""} />
                {firstExample && (
                  <div className="mt-6 space-y-3">
                    <p className="font-medium">Example (first test case)</p>
                    <div className="rounded-lg border p-3 space-y-2 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs mb-0.5">Input</p>
                        <pre className="bg-muted rounded p-2 font-mono text-xs overflow-x-auto whitespace-pre-wrap break-all">
                          {firstExample.fnName
                            ? `${firstExample.fnName}(${firstExample.input.map((a) => JSON.stringify(a)).join(", ")})`
                            : `[${firstExample.input.map((a) => JSON.stringify(a)).join(", ")}]`}
                        </pre>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs mb-0.5">Expected output</p>
                        <pre className="bg-muted rounded p-2 font-mono text-xs overflow-x-auto whitespace-pre-wrap break-all">
                          {firstExample.output}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
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
            {loading ? (
              <div className="text-muted-foreground">Running…</div>
            ) : testResult?.judgeResult?.results ? (
              <TestResultsView judgeResult={testResult.judgeResult} showFirstTestDetails={true} />
            ) : submitResult ? (
              <OutputDisplay
                result={
                  submitResult.correct === true
                    ? { stdout: "Correct! Waiting for opponent to submit." }
                    : submitResult.correct === false
                      ? {
                        stdout: (submitResult.judgeResult as JudgeResult)?.stdout || (submitResult.judgeResult as JudgeResult)?.error || "Wrong answer.",
                        stderr: (submitResult.judgeResult as JudgeResult)?.stderr
                      }
                      : undefined
                }
                loading={false}
              />
            ) : (
              <div className="text-muted-foreground">Submit to see test results.</div>
            )}
          </TabsContent>
        </Tabs>
        <div className="fixed bottom-5 right-6">
          <Button
            variant="outline"
            onClick={submitCode}
            disabled={loading || finished || !!(timerActive && iTriggeredTimer)}
          >
            {timerActive && iTriggeredTimer ? "Waiting for Opponent..." : "Submit"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function TimerCountdown({ endsAt, onExpire }: { endsAt: Date; onExpire: () => void }) {
  const [left, setLeft] = useState(() => Math.max(0, Math.ceil((endsAt.getTime() - Date.now()) / 1000)));
  useEffect(() => {
    let expired = false;
    const t = setInterval(() => {
      const s = Math.max(0, Math.ceil((endsAt.getTime() - Date.now()) / 1000));
      setLeft(s);
      if (s <= 0 && !expired) {
        expired = true;
        clearInterval(t);
        onExpire();
      }
    }, 200);
    return () => clearInterval(t);
  }, [endsAt, onExpire]);
  return <p className="font-mono font-semibold">{left}s</p>;
}
