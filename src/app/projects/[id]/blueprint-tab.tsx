"use client"

import { useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import type { GrammarBlueprintExtraction } from "@/lib/schemas/grammar-blueprint"
import type { GrammarBlueprint } from "@/types/db"

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = "idle" | "distilling" | "done" | "error"

/** All JSON TEXT columns parsed into typed objects for display */
interface ParsedBlueprint {
  sequence_pattern: GrammarBlueprintExtraction["sequence_pattern"] | null
  density: "sparse" | "medium" | "dense" | null
  avg_length: number | null
  compression_style: string | null
  sentence_structure: string | null
  qualifier_placement: string | null
  characteristic_phrases: string[]
  style_vocabulary: string[]
  summary: string | null
  raw_prompts: string[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDbBlueprint(raw: GrammarBlueprint): ParsedBlueprint {
  const distilled = raw.distilled_grammar
    ? (JSON.parse(raw.distilled_grammar) as GrammarBlueprintExtraction)
    : null
  return {
    sequence_pattern: raw.sequence_pattern
      ? (JSON.parse(raw.sequence_pattern) as GrammarBlueprintExtraction["sequence_pattern"])
      : null,
    density: raw.density as "sparse" | "medium" | "dense" | null,
    avg_length: raw.avg_length,
    compression_style: raw.compression_style,
    sentence_structure: distilled?.sentence_structure ?? null,
    qualifier_placement: distilled?.qualifier_placement ?? null,
    characteristic_phrases: distilled?.characteristic_phrases ?? [],
    style_vocabulary: distilled?.style_vocabulary ?? [],
    summary: distilled?.summary ?? null,
    raw_prompts: raw.raw_prompts
      ? (JSON.parse(raw.raw_prompts) as string[])
      : [],
  }
}

function parsePrompts(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BlueprintTab({ projectId }: { projectId: string }) {
  const [phase, setPhase] = useState<Phase>("idle")
  const [text, setText] = useState("")
  const [name, setName] = useState("")
  const [parsedBlueprint, setParsedBlueprint] = useState<ParsedBlueprint | null>(null)
  const [errorMsg, setErrorMsg] = useState("")

  const prompts = parsePrompts(text)
  const promptCount = prompts.length

  function reset() {
    setPhase("idle")
    setText("")
    setName("")
    setParsedBlueprint(null)
    setErrorMsg("")
  }

  async function distill() {
    setPhase("distilling")
    try {
      const res = await fetch("/api/distill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          prompts,
          ...(name.trim() ? { name: name.trim() } : {}),
        }),
      })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        setErrorMsg(data.error ?? "Distillation failed.")
        setPhase("error")
        return
      }
      const data = (await res.json()) as {
        id: string
        blueprint: GrammarBlueprint
      }
      setParsedBlueprint(parseDbBlueprint(data.blueprint))
      setPhase("done")
    } catch {
      setErrorMsg("Distillation failed. Check the server logs for details.")
      setPhase("error")
    }
  }

  // ── Render: idle ────────────────────────────────────────────────────────────

  if (phase === "idle" || phase === "error") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="prompts-input">Reference prompts</Label>
          <Textarea
            id="prompts-input"
            rows={10}
            placeholder="Paste reference prompts here, one per line…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="resize-y font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            {promptCount === 0
              ? "No prompts detected"
              : `${promptCount.toString()} prompt${promptCount !== 1 ? "s" : ""} detected`}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="blueprint-name">Blueprint name (optional)</Label>
          <Input
            id="blueprint-name"
            placeholder="e.g. Midjourney cinematic style"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="max-w-sm"
          />
        </div>

        {phase === "error" && (
          <div className="rounded-md border border-destructive/50 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {errorMsg}
          </div>
        )}

        <div>
          <Button
            onClick={() => void distill()}
            disabled={promptCount === 0}
          >
            {phase === "error" ? "Try again" : "Distill Grammar"}
          </Button>
        </div>
      </div>
    )
  }

  // ── Render: distilling ──────────────────────────────────────────────────────

  if (phase === "distilling") {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-lg border p-12 text-center">
        <Spinner />
        <p className="text-sm font-medium">Distilling grammar…</p>
        <p className="text-xs text-muted-foreground">
          Agent B1 is analyzing {promptCount} prompt{promptCount !== 1 ? "s" : ""}. This may take 10–30 seconds.
        </p>
      </div>
    )
  }

  // ── Render: done ─────────────────────────────────────────────────────────────

  if (!parsedBlueprint) return null

  return (
    <div className="flex flex-col gap-6">
      {/* Header: summary + reset */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Grammar Summary
        </p>
        <p className="text-base leading-relaxed">
          {parsedBlueprint.summary ?? "—"}
        </p>
        <div className="mt-1">
          <Button variant="outline" size="sm" onClick={reset}>
            New distillation
          </Button>
        </div>
      </div>

      <Separator />

      {/* 2-col grid: Sequence Pattern + Writing Mechanics */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Sequence Pattern */}
        {parsedBlueprint.sequence_pattern && (
          <SchemaCard title="Sequence Pattern">
            <div className="mb-3">
              <p className="mb-1 text-xs text-muted-foreground">Template</p>
              <code className="block rounded bg-muted px-2 py-1.5 text-xs leading-relaxed">
                {parsedBlueprint.sequence_pattern.template}
              </code>
            </div>
            <div>
              <p className="mb-1.5 text-xs text-muted-foreground">Elements</p>
              <div className="flex flex-wrap gap-1.5">
                {parsedBlueprint.sequence_pattern.elements.map((el, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {el}
                  </Badge>
                ))}
              </div>
            </div>
          </SchemaCard>
        )}

        {/* Writing Mechanics */}
        <SchemaCard title="Writing Mechanics">
          <div className="flex items-start justify-between gap-4 py-1 text-sm">
            <span className="shrink-0 text-muted-foreground">Density</span>
            <DensityBadge density={parsedBlueprint.density} />
          </div>
          {parsedBlueprint.avg_length !== null && (
            <FieldRow
              label="Avg length"
              value={`${parsedBlueprint.avg_length.toString()} chars`}
            />
          )}
          {parsedBlueprint.compression_style && (
            <FieldRow
              label="Compression"
              value={parsedBlueprint.compression_style}
            />
          )}
          {parsedBlueprint.sentence_structure && (
            <FieldRow
              label="Sentence structure"
              value={parsedBlueprint.sentence_structure}
            />
          )}
          {parsedBlueprint.qualifier_placement && (
            <FieldRow
              label="Qualifier placement"
              value={parsedBlueprint.qualifier_placement}
            />
          )}
        </SchemaCard>
      </div>

      {/* Full-width: Characteristic Phrases */}
      <SchemaCard
        title={`Characteristic Phrases (${parsedBlueprint.characteristic_phrases.length.toString()})`}
      >
        {parsedBlueprint.characteristic_phrases.length === 0 ? (
          <p className="text-sm text-muted-foreground">None detected</p>
        ) : (
          <ol className="list-inside list-decimal space-y-1.5">
            {parsedBlueprint.characteristic_phrases.map((phrase, i) => (
              <li key={i} className="text-sm">
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                  {phrase}
                </code>
              </li>
            ))}
          </ol>
        )}
      </SchemaCard>

      {/* Full-width: Style Vocabulary */}
      <SchemaCard
        title={`Style Vocabulary (${parsedBlueprint.style_vocabulary.length.toString()})`}
      >
        {parsedBlueprint.style_vocabulary.length === 0 ? (
          <p className="text-sm text-muted-foreground">None detected</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {parsedBlueprint.style_vocabulary.map((term, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {term}
              </Badge>
            ))}
          </div>
        )}
      </SchemaCard>

      {/* Collapsible: Input prompts used */}
      {parsedBlueprint.raw_prompts.length > 0 && (
        <SchemaCard
          title={`Source Prompts (${parsedBlueprint.raw_prompts.length.toString()})`}
        >
          <ol className="list-inside list-decimal space-y-2">
            {parsedBlueprint.raw_prompts.map((p, i) => (
              <li
                key={i}
                className="text-xs text-muted-foreground"
              >
                {p}
              </li>
            ))}
          </ol>
        </SchemaCard>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg
      className="h-5 w-5 animate-spin text-muted-foreground"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}

function SchemaCard({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <Card>
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">{children}</CardContent>
    </Card>
  )
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  )
}

function DensityBadge({
  density,
}: {
  density: "sparse" | "medium" | "dense" | null
}) {
  if (!density) return <span className="text-sm text-muted-foreground">—</span>
  const variant =
    density === "sparse"
      ? "secondary"
      : density === "dense"
        ? "destructive"
        : "default"
  return (
    <Badge variant={variant} className="text-xs capitalize">
      {density}
    </Badge>
  )
}
