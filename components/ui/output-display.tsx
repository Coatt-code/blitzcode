interface OutputDisplayProps {
  result?: { stdout?: string };
  loading: boolean;
}

export default function OutputDisplay({ result, loading }: OutputDisplayProps) {
  if (loading) return <div className="my-5 text-muted-foreground">Running…</div>;
  if (!result) return <div className="my-5 text-muted-foreground">No output yet</div>;

  return (
    <div className="my-5">
        <code className="bg-muted rounded px-[0.3rem]  py-[0.2rem] font-mono">
        {result.stdout}
        </code>
    </div>

  );
}