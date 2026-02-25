interface OutputDisplayProps {
  result?: {
    stdout?: string;
    stderr?: string;
    results?: Array<{
      index: number;
      test?: string;
      passed?: boolean;
      error?: string;
      stdout?: string;
      expected?: string;
      actual?: string | null;
    }>;
    passed?: boolean;
    error?: string;
    execution_time_ms?: number;
  };
  loading: boolean;
}

export default function OutputDisplay({ result, loading }: OutputDisplayProps) {
  if (loading) return <div className="my-5 text-muted-foreground">Running…</div>;
  if (!result) return <div className="my-5 text-muted-foreground">No output yet</div>;

  const results = result.results ?? [];
  const hasResults = results.length > 0;
  const allPassed = result.passed ?? (hasResults ? results.every((r) => r.passed) : undefined);

  return (
    <div className="my-5 space-y-3">
      {result.error && !hasResults && (
        <div className="text-sm text-red-600 dark:text-red-400">
          {result.error}
        </div>
      )}

      {hasResults && (
        <div className="space-y-3">
          <p className="text-sm font-medium">
            {allPassed ? "All test cases passed." : "Some test cases failed."}
            {result.execution_time_ms != null && (
              <span className="text-muted-foreground font-normal ml-2">
                ({result.execution_time_ms} ms)
              </span>
            )}
          </p>
          <div className="space-y-3">
            {results.map((r) => (
              <div key={r.index} className="rounded-lg border p-3 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">Test case {r.index + 1}</span>
                  <span className={r.passed ? "text-green-600" : "text-red-600"}>
                    {r.passed ? "Passed" : "Failed"}
                  </span>
                </div>
                {r.test && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">Test</p>
                    <pre className="bg-muted rounded p-2 font-mono text-xs overflow-x-auto whitespace-pre-wrap break-all">
                      {r.test}
                    </pre>
                  </div>
                )}
                {r.error && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">Error</p>
                    <pre className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded p-2 font-mono text-xs overflow-x-auto whitespace-pre-wrap break-all text-red-800 dark:text-red-200">
                      {r.error}
                    </pre>
                  </div>
                )}
                {r.stdout && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">Stdout</p>
                    <pre className="bg-muted rounded p-2 font-mono text-xs overflow-x-auto whitespace-pre-wrap break-all">
                      {r.stdout}
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
              </div>
            ))}
          </div>
        </div>
      )}

      {result.stdout && (
        <div>
          <p className="text-sm text-muted-foreground mb-1">Output:</p>
          <code className="bg-muted rounded px-[0.3rem] py-[0.2rem] font-mono text-sm block">
            {result.stdout}
          </code>
        </div>
      )}
      {result.stderr && (
        <div>
          <p className="text-sm text-red-600 dark:text-red-400 mb-1">Error:</p>
          <pre className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded px-[0.3rem] py-[0.2rem] font-mono text-sm text-red-800 dark:text-red-200 overflow-x-auto">
            {result.stderr}
          </pre>
        </div>
      )}
    </div>
  );
}