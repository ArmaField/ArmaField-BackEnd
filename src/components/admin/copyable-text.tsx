"use client";

import { useState } from "react";

export function CopyableText({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-center">
      {label && <p className="text-xs text-zinc-500">{label}</p>}
      <button
        onClick={handleCopy}
        className="mt-1 cursor-pointer font-mono text-sm text-zinc-300 transition-colors hover:text-white"
        title="Click to copy"
      >
        {copied ? "Copied!" : text}
      </button>
    </div>
  );
}
