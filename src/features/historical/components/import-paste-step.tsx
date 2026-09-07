"use client";

import * as React from "react";
import { ClipboardPaste, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ImportPasteStepProps {
  rawText: string;
  fileName: string | null;
  error: string | null;
  onRawTextChange: (value: string) => void;
  onFile: (text: string, name: string) => void;
  onAnalyze: () => void;
}

/** Step 1: paste the JSON or upload a .json file. */
export function ImportPasteStep({
  rawText,
  fileName,
  error,
  onRawTextChange,
  onFile,
  onAnalyze,
}: ImportPasteStepProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    onFile(text, file.name);
    event.target.value = "";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Pegar o subir</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="historical-json">JSON del lote (schemaVersion 2)</Label>
            <Textarea
              id="historical-json"
              value={rawText}
              onChange={(event) => onRawTextChange(event.target.value)}
              placeholder={'{\n  "schemaVersion": 2,\n  "batch": { "id": "libreta-2026-01", "source": "voice" },\n  "works": []\n}'}
              rows={10}
              className="font-mono text-xs leading-relaxed"
            />
          </div>

          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleFile}
              aria-label="Subir archivo JSON"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileUp className="h-4 w-4" aria-hidden="true" />
              {fileName ? `Reemplazar ${fileName}` : "Subir archivo .json"}
            </Button>
          </div>

          {error ? (
            <p className="text-sm text-[var(--color-status-danger)]" role="alert">
              {error}
            </p>
          ) : null}

          <Button type="button" onClick={onAnalyze} disabled={rawText.trim() === ""} className="w-full">
            <ClipboardPaste className="h-4 w-4" aria-hidden="true" />
            Analizar y revisar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}