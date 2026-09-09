"use client";

import * as React from "react";

/**
 * Minimal markdown renderer for assistant answers.
 *
 * Supports only a safe subset: **bold**, lines starting with "- " as list
 * items, and line breaks. No HTML passthrough: everything is rendered as React
 * text nodes, so there is no raw-HTML injection surface.
 */
function renderInline(segment: string, keyBase: number): React.ReactNode[] {
  return segment.split("**").map((part, index) =>
    index % 2 === 1 ? (
      <strong key={`${keyBase}-${index}`}>{part}</strong>
    ) : (
      <React.Fragment key={`${keyBase}-${index}`}>{part}</React.Fragment>
    ),
  );
}

export function AssistantMarkdown({ text }: { text: string }) {
  const blocks: React.ReactNode[] = [];
  let bullets: string[] = [];
  let key = 0;

  const flushBullets = () => {
    if (bullets.length === 0) return;
    blocks.push(
      <ul key={key} className="my-1 list-disc space-y-1 pl-5">
        {bullets.map((bullet, index) => (
          <li key={index}>{renderInline(bullet, index)}</li>
        ))}
      </ul>,
    );
    key += 1;
    bullets = [];
  };

  for (const rawLine of text.split("\n")) {
    const line = rawLine.replace(/\r$/, "");
    if (line.trim() === "") {
      flushBullets();
      continue;
    }
    const bullet = /^[-*]\s+(.*)$/.exec(line);
    if (bullet) {
      bullets.push(bullet[1]);
      continue;
    }
    flushBullets();
    blocks.push(
      <p key={key} className="whitespace-pre-wrap">
        {renderInline(line, key)}
      </p>,
    );
    key += 1;
  }
  flushBullets();

  return <div className="text-sm leading-6 text-[var(--color-text-main)]">{blocks}</div>;
}