"use client"

import { useState, useRef, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type { DesignExtraction } from "@/lib/schemas/design-extraction"
import type { DesignSchema } from "@/types/db"

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = "idle" | "uploading" | "ready" | "analyzing" | "done" | "error"

/** All JSON TEXT columns parsed into typed objects for display */
interface ParsedSchema {
  frame: DesignExtraction["frame"] | null
  palette: DesignExtraction["palette"] | null
  layout: DesignExtraction["layout"] | null
  text_fields: DesignExtraction["text_fields"]
  type_scale: DesignExtraction["type_scale"]
  elements: DesignExtraction["elements"]
  style_summary: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDbSchema(raw: DesignSchema): ParsedSchema {
  const rawAnalysis = raw.raw_analysis
    ? (JSON.parse(raw.raw_analysis) as DesignExtraction)
    : null
  return {
    frame: raw.frame ? (JSON.parse(raw.frame) as DesignExtraction["frame"]) : null,
    palette: raw.palette
      ? (JSON.parse(raw.palette) as DesignExtraction["palette"])
      : null,
    layout: raw.layout
      ? (JSON.parse(raw.layout) as DesignExtraction["layout"])
      : null,
    text_fields: raw.text_fields
      ? (JSON.parse(raw.text_fields) as DesignExtraction["text_fields"])
      : [],
    type_scale: raw.type_scale
      ? (JSON.parse(raw.type_scale) as DesignExtraction["type_scale"])
      : null,
    elements: raw.elements
      ? (JSON.parse(raw.elements) as DesignExtraction["elements"])
      : [],
    style_summary: rawAnalysis?.style_summary ?? null,
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AnalyzeTab({ projectId }: { projectId: string }) {
  const [phase, setPhase] = useState<Phase>("idle")
  const [filename, setFilename] = useState("")
  const [previewUrl, setPreviewUrl] = useState("")
  const [parsedSchema, setParsedSchema] = useState<ParsedSchema | null>(null)
  const [errorMsg, setErrorMsg] = useState("")
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function reset() {
    setPhase("idle")
    setFilename("")
    setPreviewUrl("")
    setParsedSchema(null)
    setErrorMsg("")
  }

  function exportJson() {
    if (!parsedSchema) return
    const blob = new Blob(
      [JSON.stringify(parsedSchema, null, 2)],
      { type: "application/json" }
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `schema-${projectId}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Only image files are accepted (PNG, JPG, WEBP).")
      setPhase("error")
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    void upload(file)
  }

  async function upload(file: File) {
    setPhase("uploading")
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        setErrorMsg(data.error ?? "Upload failed.")
        setPhase("error")
        return
      }
      const data = (await res.json()) as { filename: string }
      setFilename(data.filename)
      setPhase("ready")
    } catch {
      setErrorMsg("Upload failed. Is the dev server running?")
      setPhase("error")
    }
  }

  async function analyze() {
    setPhase("analyzing")
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, filename }),
      })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        setErrorMsg(data.error ?? "Analysis failed.")
        setPhase("error")
        return
      }
      const data = (await res.json()) as { id: string; schema: DesignSchema }
      setParsedSchema(parseDbSchema(data.schema))
      setPhase("done")
    } catch {
      setErrorMsg("Analysis failed. Check the server logs for details.")
      setPhase("error")
    }
  }

  // ── Drag-and-drop handlers ──────────────────────────────────────────────────

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave() {
    setIsDragging(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  // ── Render: idle ────────────────────────────────────────────────────────────

  if (phase === "idle") {
    return (
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={[
          "flex min-h-64 cursor-pointer flex-col items-center justify-center",
          "rounded-lg border-2 border-dashed p-12 text-center transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30",
        ].join(" ")}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleInputChange}
        />
        <div className="text-4xl" aria-hidden="true">
          🖼️
        </div>
        <p className="mt-4 font-medium">Drop an image here</p>
        <p className="mt-1 text-sm text-muted-foreground">
          or click to browse files
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          PNG, JPG, WEBP — max 10 MB
        </p>
      </div>
    )
  }

  // ── Render: uploading ───────────────────────────────────────────────────────

  if (phase === "uploading") {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-lg border p-12 text-center">
        <Spinner />
        <p className="text-sm text-muted-foreground">Uploading image…</p>
      </div>
    )
  }

  // ── Render: ready ───────────────────────────────────────────────────────────

  if (phase === "ready") {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-start gap-6">
          <div className="shrink-0 overflow-hidden rounded-lg border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Reference image preview"
              className="h-48 w-auto max-w-xs object-contain"
            />
          </div>
          <div className="flex flex-col gap-3 pt-2">
            <p className="text-sm font-medium">Image ready for analysis</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              Agent A will extract the frame, palette, layout, typography, and
              visual elements from this image.
            </p>
            <Button onClick={() => void analyze()} className="w-fit">
              Analyze Design
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-fit"
              onClick={reset}
            >
              Change image
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ── Render: analyzing ───────────────────────────────────────────────────────

  if (phase === "analyzing") {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-start gap-6">
          <div className="shrink-0 overflow-hidden rounded-lg border opacity-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Reference image preview"
              className="h-48 w-auto max-w-xs object-contain"
            />
          </div>
          <div className="flex flex-col gap-3 pt-2">
            <div className="flex items-center gap-2">
              <Spinner />
              <p className="text-sm font-medium">Analyzing design…</p>
            </div>
            <p className="max-w-xs text-xs text-muted-foreground">
              Agent A is extracting the design schema. This may take 10–30
              seconds.
            </p>
            <Button disabled className="w-fit">
              Analyzing…
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ── Render: error ───────────────────────────────────────────────────────────

  if (phase === "error") {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-4 rounded-lg border border-destructive/50 bg-destructive/5 p-12 text-center">
        <p className="font-medium text-destructive">Something went wrong</p>
        <p className="text-sm text-muted-foreground">{errorMsg}</p>
        <Button variant="outline" onClick={reset}>
          Try again
        </Button>
      </div>
    )
  }

  // ── Render: done ─────────────────────────────────────────────────────────────

  if (!parsedSchema) return null

  return (
    <div className="flex flex-col gap-6">
      {/* Header: image preview + style summary */}
      <div className="flex items-start gap-6">
        <div className="shrink-0 overflow-hidden rounded-lg border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Reference image"
            className="h-48 w-auto max-w-xs object-contain"
          />
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Style Summary
          </p>
          <p className="text-base leading-relaxed">
            {parsedSchema.style_summary ?? "—"}
          </p>
          <div className="mt-2 flex gap-2">
            <Button variant="outline" size="sm" onClick={reset}>
              Upload new image
            </Button>
            <Button variant="outline" size="sm" onClick={exportJson}>
              Export JSON
            </Button>
          </div>
        </div>
      </div>

      <Separator />

      {/* 2-col grid: Frame / Palette / Layout / Typography */}
      <div className="grid gap-4 sm:grid-cols-2">
        {parsedSchema.frame && (
          <SchemaCard title="Frame">
            <FieldRow
              label="Aspect ratio"
              value={parsedSchema.frame.aspect_ratio}
            />
            <FieldRow
              label="Orientation"
              value={parsedSchema.frame.orientation}
            />
            <FieldRow
              label="Negative space"
              value={parsedSchema.frame.negative_space}
            />
            <FieldRow
              label="Composition"
              value={parsedSchema.frame.composition}
            />
          </SchemaCard>
        )}

        {parsedSchema.palette && (
          <SchemaCard title="Palette">
            <ColorRow label="Primary" hex={parsedSchema.palette.primary} />
            <ColorRow label="Secondary" hex={parsedSchema.palette.secondary} />
            <ColorRow label="Accent" hex={parsedSchema.palette.accent} />
            <ColorRow
              label="Background"
              hex={parsedSchema.palette.background}
            />
            <ColorRow label="Text" hex={parsedSchema.palette.text_color} />
            <FieldRow label="Mood" value={parsedSchema.palette.mood} />
            <FieldRow
              label="Saturation"
              value={parsedSchema.palette.saturation}
            />
          </SchemaCard>
        )}

        {parsedSchema.layout && (
          <SchemaCard title="Layout">
            <FieldRow
              label="Structure"
              value={parsedSchema.layout.structure}
            />
            <FieldRow
              label="Focal point"
              value={parsedSchema.layout.focal_point}
            />
            <FieldRow label="Depth" value={parsedSchema.layout.depth} />
            <div className="mt-2">
              <p className="text-xs text-muted-foreground">Visual hierarchy</p>
              <ol className="mt-1 list-inside list-decimal space-y-0.5 text-sm">
                {parsedSchema.layout.visual_hierarchy.map((item, i) => (
                  <li key={i} className="text-muted-foreground">
                    {item}
                  </li>
                ))}
              </ol>
            </div>
          </SchemaCard>
        )}

        <SchemaCard title="Typography">
          {parsedSchema.type_scale ? (
            <>
              <FieldRow
                label="Typeface"
                value={parsedSchema.type_scale.primary_typeface}
              />
              <FieldRow
                label="Weight range"
                value={parsedSchema.type_scale.weight_range}
              />
              <FieldRow label="Scale" value={parsedSchema.type_scale.scale} />
              <FieldRow
                label="Letter spacing"
                value={parsedSchema.type_scale.letter_spacing}
              />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No typography detected
            </p>
          )}
        </SchemaCard>
      </div>

      {/* Full-width: Text Fields */}
      <SchemaCard
        title={`Text Fields (${parsedSchema.text_fields.length.toString()})`}
      >
        {parsedSchema.text_fields.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No text elements detected
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {parsedSchema.text_fields.map((tf, i) => (
              <div
                key={i}
                className="rounded-md border bg-muted/30 p-3 text-sm"
              >
                <p className="font-medium capitalize">{tf.role}</p>
                <p className="mt-1 text-xs text-muted-foreground">{tf.style}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {tf.position}
                </p>
              </div>
            ))}
          </div>
        )}
      </SchemaCard>

      {/* Full-width: Visual Elements */}
      <SchemaCard
        title={`Visual Elements (${parsedSchema.elements.length.toString()})`}
      >
        {parsedSchema.elements.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No visual elements detected
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {parsedSchema.elements.map((el, i) => (
              <div
                key={i}
                className="rounded-md border bg-muted/30 p-3 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium capitalize">{el.type}</p>
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    {el.prominence}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {el.description}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {el.position}
                </p>
              </div>
            ))}
          </div>
        )}
      </SchemaCard>
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

function ColorRow({ label, hex }: { label: string; hex: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-4 w-6 rounded border border-border"
          style={{ backgroundColor: hex }}
          aria-hidden="true"
        />
        <span className="font-mono text-xs">{hex}</span>
      </div>
    </div>
  )
}
