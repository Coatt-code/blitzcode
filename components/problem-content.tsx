"use client";

import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

/**
 * Converts -----SectionName----- (5 dashes each side) into ## SectionName
 * so it renders as a markdown heading.
 */
function sectionsToMarkdownHeaders(text: string): string {
  return text.replace(/-----([^-]+)-----/g, "\n\n## $1\n\n");
}

export function ProblemContent({ question }: { question: string }) {
  const md = sectionsToMarkdownHeaders(question ?? "");
  return (
    <div className="prose dark:prose-invert max-w-none [&_.katex]:text-inherit">
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
      >
        {md}
      </ReactMarkdown>
    </div>
  );
}
