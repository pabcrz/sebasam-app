"use client";

import * as React from "react";
import { Send } from "lucide-react";
import type { AssistantSource } from "@/features/assistant/service";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { SourcePanel } from "./source-panel";
import { AssistantMarkdown } from "./assistant-markdown";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: AssistantSource[];
  error?: boolean;
}

interface ChatResponse {
  answer?: string;
  sources?: AssistantSource[];
  error?: string;
}

/**
 * Chat UI for the historical assistant. Sends questions to POST
 * /api/assistant/chat and renders the answer with expandable source panels.
 */
export function AssistantChat() {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const question = input.trim();
    if (question === "" || pending) return;

    setPending(true);
    setError(null);
    setMessages((current) => [...current, { role: "user", content: question }]);
    setInput("");

    try {
      const response = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = (await response.json()) as ChatResponse;
      if (!response.ok) {
        setMessages((current) => [
          ...current,
          { role: "assistant", content: data.error ?? "Ocurrió un error.", error: true },
        ]);
      } else {
        setMessages((current) => [
          ...current,
          {
            role: "assistant",
            content: data.answer ?? "Sin respuesta.",
            sources: data.sources ?? [],
          },
        ]);
      }
    } catch {
      setError("No se pudo conectar con el asistente. Intentá de nuevo.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-4">
      {messages.length === 0 ? (
        <Card>
          <CardContent>
            <p className="text-sm text-[var(--color-text-muted)]">
              Preguntá por trabajos históricos, por ejemplo: “¿Cuánto cobramos por cambiar
              bujes?”, “¿Cuánto generó Luis en enero?” o “¿Qué refacciones se vendieron para
              Nissan NP300?”. Las cifras distinguen dato capturado, derivado y desconocido.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {messages.filter((message) => message.content !== "").map((message, index) => (
            <div key={index} className={message.role === "user" ? "text-right" : "text-left"}>
              <div
                className={
                  message.role === "user"
                    ? "inline-block max-w-full rounded-2xl bg-[var(--color-primary)] px-4 py-2 text-left text-sm text-white"
                    : "inline-block max-w-full rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-surface)] px-4 py-3 text-left text-sm text-[var(--color-text-main)]"
                }
              >
                {message.role === "user" ? (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                ) : (
                  <AssistantMarkdown text={message.content} />
                )}
                {message.error ? null : message.sources && message.sources.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                      Fuentes ({message.sources.length})
                    </p>
                    {message.sources.map((source) => (
                      <SourcePanel key={`${source.provenance}-${source.itemId}`} source={source} />
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
          {pending ? (
            <div className="text-left">
              <div className="inline-flex items-center gap-2 rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text-muted)]">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--color-primary)]" />
                Pensando…
              </div>
            </div>
          ) : null}
        </div>
      )}

      {error ? <p className="text-sm text-[var(--color-status-danger)]">{error}</p> : null}

      <form onSubmit={submit} className="flex items-end gap-2">
        <Textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Escribí tu pregunta sobre los trabajos históricos…"
          aria-label="Pregunta al asistente"
          rows={2}
          maxLength={1000}
          className="min-h-[var(--tap-min-height)]"
        />
        <Button type="submit" disabled={pending || input.trim() === ""} aria-label="Enviar pregunta">
          <Send className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Enviar</span>
        </Button>
      </form>
    </div>
  );
}
