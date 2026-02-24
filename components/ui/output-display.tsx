interface OutputDisplayProps {
  result?: { stdout?: string; stderr?: string };
  loading: boolean;
}

export default function OutputDisplay({ result, loading }: OutputDisplayProps) {
  if (loading) return <div className="my-5 text-muted-foreground">Running…</div>;
  if (!result) return <div className="my-5 text-muted-foreground">No output yet</div>;

  return (
    <div className="my-5 space-y-3">
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