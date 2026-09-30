"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Transforma marcações [1], [2, 3] em links internos que viram "chips" de citação. */
function linkCitations(md: string): string {
  return md.replace(/\[(\d+(?:\s*,\s*\d+)*)\](?!\()/g, (_m, nums: string) =>
    nums
      .split(",")
      .map((n) => `[${n.trim()}](#fonte-${n.trim()})`)
      .join(""),
  );
}

export function Markdown({
  content,
  streaming = false,
  onCite,
}: {
  content: string;
  streaming?: boolean;
  onCite?: (n: number) => void;
}) {
  return (
    <div
      className={`prose prose-slate max-w-none prose-headings:font-display prose-headings:font-semibold prose-headings:text-slate-900 prose-h1:text-2xl prose-h2:text-lg prose-h2:mt-6 prose-h3:text-base prose-p:leading-relaxed prose-li:my-0.5 prose-strong:text-slate-900 prose-a:text-brand-700 prose-blockquote:border-brand-300 prose-blockquote:bg-brand-50/60 prose-blockquote:py-1 prose-blockquote:not-italic prose-table:text-sm prose-th:bg-slate-50 prose-th:px-3 prose-td:px-3 prose-code:before:content-none prose-code:after:content-none ${streaming ? "streaming-caret" : ""}`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a({ href, children }) {
            const m = href?.match(/^#fonte-(\d+)$/);
            if (m) {
              const n = Number(m[1]);
              return (
                <button
                  type="button"
                  onClick={() => onCite?.(n)}
                  className="mx-0.5 inline-flex h-[1.35em] min-w-[1.35em] -translate-y-px items-center justify-center rounded-md bg-brand-100 px-1 align-middle text-[0.7em] font-semibold text-brand-800 no-underline transition hover:bg-brand-200"
                  title={`Ver fonte ${n}`}
                >
                  {n}
                </button>
              );
            }
            return (
              <a href={href} target="_blank" rel="noreferrer">
                {children}
              </a>
            );
          },
          table({ children }) {
            return (
              <div className="not-prose my-4 overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full border-collapse text-sm [&_td]:border-t [&_td]:border-slate-100 [&_td]:px-3 [&_td]:py-2 [&_td]:align-top [&_th]:bg-slate-50 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold">
                  {children}
                </table>
              </div>
            );
          },
        }}
      >
        {linkCitations(content)}
      </ReactMarkdown>
    </div>
  );
}
