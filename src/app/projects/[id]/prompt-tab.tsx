"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import type { DesignExtraction } from "@/lib/schemas/design-extraction"
import type { DesignSchema } from "@/types/db"

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = "loading" | "empty" | "ready" | "saving" | "error"

interface EditableSchema {
  id: string
  frame: DesignExtraction["frame"] | null
  palette: DesignExtraction["palette"] | null
  layout: DesignExtraction["layout"] | null
  type_scale: DesignExtraction["type_scale"]
  text_fields: DesignExtraction["text_fields"]
  elements: DesignExtraction["elements"]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDbSchema(raw: DesignSchema): EditableSchema {
  return {
    id: raw.id,
    frame: raw.frame ? (JSON.parse(raw.frame) as DesignExtraction["frame"]) : null,
    palette: raw.palette
      ? (JSON.parse(raw.palette) as DesignExtraction["palette"])
      : null,
    layout: raw.layout
      ? (JSON.parse(raw.layout) as DesignExtraction["layout"])
      : null,
    type_scale: raw.type_scale
      ? (JSON.parse(raw.type_scale) as DesignExtraction["type_scale"])
      : null,
    text_fields: raw.text_fields
      ? (JSON.parse(raw.text_fields) as DesignExtraction["text_fields"])
      : [],
    elements: raw.elements
      ? (JSON.parse(raw.elements) as DesignExtraction["elements"])
      : [],
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PromptTab({ projectId }: { projectId: string }) {
  const [phase, setPhase] = useState<Phase>("loading")
  const [schema, setSchema] = useState<EditableSchema | null>(null)
  const [original, setOriginal] = useState<EditableSchema | null>(null)
  const [lockedFields, setLockedFields] = useState<string[]>([])
  const [originalLocked, setOriginalLocked] = useState<string[]>([])
  const [errorMsg, setErrorMsg] = useState("")

  const isDirty =
    JSON.stringify(schema) !== JSON.stringify(original) ||
    JSON.stringify(lockedFields) !== JSON.stringify(originalLocked)

  useEffect(() => {
    void loadSchema()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  async function loadSchema() {
    setPhase("loading")
    setErrorMsg("")
    try {
      const res = await fetch(`/api/schemas?projectId=${projectId}`)
      if (res.status === 404) {
        setPhase("empty")
        return
      }
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        setErrorMsg(data.error ?? "Failed to load schema.")
        setPhase("error")
        return
      }
      const raw = (await res.json()) as DesignSchema
      const parsed = parseDbSchema(raw)
      const locks = JSON.parse(raw.locked_fields) as string[]
      setSchema(parsed)
      setOriginal(parsed)
      setLockedFields(locks)
      setOriginalLocked(locks)
      setPhase("ready")
    } catch {
      setErrorMsg("Failed to load schema. Check the dev server.")
      setPhase("error")
    }
  }

  function toggleLock(section: string) {
    setLockedFields((prev) =>
      prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]
    )
  }

  function isLocked(section: string) {
    return lockedFields.includes(section)
  }

  function isModified(section: keyof Omit<EditableSchema, "id">): boolean {
    if (!original || !schema) return false
    return JSON.stringify(schema[section]) !== JSON.stringify(original[section])
  }

  async function save() {
    if (!schema) return
    setPhase("saving")
    setErrorMsg("")
    try {
      const res = await fetch(`/api/schemas/${schema.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          frame: schema.frame,
          palette: schema.palette,
          layout: schema.layout,
          type_scale: schema.type_scale,
          text_fields: schema.text_fields,
          elements: schema.elements,
          locked_fields: lockedFields,
        }),
      })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        setErrorMsg(data.error ?? "Save failed.")
        setPhase("ready")
        return
      }
      setOriginal(schema)
      setOriginalLocked(lockedFields)
      setPhase("ready")
    } catch {
      setErrorMsg("Save failed. Check the dev server.")
      setPhase("ready")
    }
  }

  // ── Render: loading ──────────────────────────────────────────────────────────

  if (phase === "loading") {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-lg border p-12 text-center">
        <Spinner />
        <p className="text-sm text-muted-foreground">Loading schema…</p>
      </div>
    )
  }

  // ── Render: empty ────────────────────────────────────────────────────────────

  if (phase === "empty") {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <p className="font-medium">No design schema yet</p>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Run the Analyze tab first to extract the design schema from a reference
          image.
        </p>
      </div>
    )
  }

  // ── Render: error ────────────────────────────────────────────────────────────

  if (phase === "error") {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-4 rounded-lg border border-destructive/50 bg-destructive/5 p-12 text-center">
        <p className="font-medium text-destructive">Failed to load schema</p>
        <p className="text-sm text-muted-foreground">{errorMsg}</p>
        <Button variant="outline" onClick={() => void loadSchema()}>
          Retry
        </Button>
      </div>
    )
  }

  // ── Render: ready / saving ───────────────────────────────────────────────────

  if (!schema) return null

  return (
    <div className="flex flex-col gap-6">
      {/* Sticky save bar */}
      <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-2">
        <p className="text-sm text-muted-foreground">
          {isDirty ? "Unsaved changes" : "All changes saved"}
        </p>
        <div className="flex items-center gap-3">
          {errorMsg && (
            <p className="text-xs text-destructive">{errorMsg}</p>
          )}
          <Button
            size="sm"
            disabled={!isDirty || phase === "saving"}
            onClick={() => void save()}
          >
            {phase === "saving" ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {/* 2-col grid: Frame / Palette / Layout / Typography */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Frame */}
        {schema.frame && (
          <EditorCard>
            <SectionHeader
              title="Frame"
              modified={isModified("frame")}
              locked={isLocked("frame")}
              onToggleLock={() => toggleLock("frame")}
            />
            <div
              className={[
                "flex flex-col gap-3 transition-opacity",
                isLocked("frame") ? "pointer-events-none opacity-60" : "",
              ].join(" ")}
            >
              <FieldInput
                label="Aspect ratio"
                value={schema.frame.aspect_ratio}
                disabled={isLocked("frame")}
                onChange={(v) =>
                  setSchema((prev) =>
                    prev?.frame
                      ? { ...prev, frame: { ...prev.frame, aspect_ratio: v } }
                      : prev
                  )
                }
              />
              <FieldInput
                label="Orientation"
                value={schema.frame.orientation}
                disabled={isLocked("frame")}
                onChange={(v) =>
                  setSchema((prev) =>
                    prev?.frame
                      ? { ...prev, frame: { ...prev.frame, orientation: v as DesignExtraction["frame"]["orientation"] } }
                      : prev
                  )
                }
              />
              <FieldInput
                label="Composition"
                value={schema.frame.composition}
                disabled={isLocked("frame")}
                onChange={(v) =>
                  setSchema((prev) =>
                    prev?.frame
                      ? { ...prev, frame: { ...prev.frame, composition: v } }
                      : prev
                  )
                }
              />
              <FieldInput
                label="Negative space"
                value={schema.frame.negative_space}
                disabled={isLocked("frame")}
                onChange={(v) =>
                  setSchema((prev) =>
                    prev?.frame
                      ? { ...prev, frame: { ...prev.frame, negative_space: v as DesignExtraction["frame"]["negative_space"] } }
                      : prev
                  )
                }
              />
            </div>
          </EditorCard>
        )}

        {/* Palette */}
        {schema.palette && (
          <EditorCard>
            <SectionHeader
              title="Palette"
              modified={isModified("palette")}
              locked={isLocked("palette")}
              onToggleLock={() => toggleLock("palette")}
            />
            <div
              className={[
                "flex flex-col gap-3 transition-opacity",
                isLocked("palette") ? "pointer-events-none opacity-60" : "",
              ].join(" ")}
            >
              <ColorInput
                label="Primary"
                value={schema.palette.primary}
                disabled={isLocked("palette")}
                onChange={(v) =>
                  setSchema((prev) =>
                    prev?.palette
                      ? { ...prev, palette: { ...prev.palette, primary: v } }
                      : prev
                  )
                }
              />
              <ColorInput
                label="Secondary"
                value={schema.palette.secondary}
                disabled={isLocked("palette")}
                onChange={(v) =>
                  setSchema((prev) =>
                    prev?.palette
                      ? { ...prev, palette: { ...prev.palette, secondary: v } }
                      : prev
                  )
                }
              />
              <ColorInput
                label="Accent"
                value={schema.palette.accent}
                disabled={isLocked("palette")}
                onChange={(v) =>
                  setSchema((prev) =>
                    prev?.palette
                      ? { ...prev, palette: { ...prev.palette, accent: v } }
                      : prev
                  )
                }
              />
              <ColorInput
                label="Background"
                value={schema.palette.background}
                disabled={isLocked("palette")}
                onChange={(v) =>
                  setSchema((prev) =>
                    prev?.palette
                      ? { ...prev, palette: { ...prev.palette, background: v } }
                      : prev
                  )
                }
              />
              <ColorInput
                label="Text"
                value={schema.palette.text_color}
                disabled={isLocked("palette")}
                onChange={(v) =>
                  setSchema((prev) =>
                    prev?.palette
                      ? { ...prev, palette: { ...prev.palette, text_color: v } }
                      : prev
                  )
                }
              />
              <FieldInput
                label="Mood"
                value={schema.palette.mood}
                disabled={isLocked("palette")}
                onChange={(v) =>
                  setSchema((prev) =>
                    prev?.palette
                      ? { ...prev, palette: { ...prev.palette, mood: v } }
                      : prev
                  )
                }
              />
              <FieldInput
                label="Saturation"
                value={schema.palette.saturation}
                disabled={isLocked("palette")}
                onChange={(v) =>
                  setSchema((prev) =>
                    prev?.palette
                      ? { ...prev, palette: { ...prev.palette, saturation: v as DesignExtraction["palette"]["saturation"] } }
                      : prev
                  )
                }
              />
            </div>
          </EditorCard>
        )}

        {/* Layout */}
        {schema.layout && (
          <EditorCard>
            <SectionHeader
              title="Layout"
              modified={isModified("layout")}
              locked={isLocked("layout")}
              onToggleLock={() => toggleLock("layout")}
            />
            <div
              className={[
                "flex flex-col gap-3 transition-opacity",
                isLocked("layout") ? "pointer-events-none opacity-60" : "",
              ].join(" ")}
            >
              <FieldInput
                label="Structure"
                value={schema.layout.structure}
                disabled={isLocked("layout")}
                onChange={(v) =>
                  setSchema((prev) =>
                    prev?.layout
                      ? { ...prev, layout: { ...prev.layout, structure: v } }
                      : prev
                  )
                }
              />
              <FieldInput
                label="Focal point"
                value={schema.layout.focal_point}
                disabled={isLocked("layout")}
                onChange={(v) =>
                  setSchema((prev) =>
                    prev?.layout
                      ? { ...prev, layout: { ...prev.layout, focal_point: v } }
                      : prev
                  )
                }
              />
              <FieldInput
                label="Depth"
                value={schema.layout.depth}
                disabled={isLocked("layout")}
                onChange={(v) =>
                  setSchema((prev) =>
                    prev?.layout
                      ? { ...prev, layout: { ...prev.layout, depth: v as DesignExtraction["layout"]["depth"] } }
                      : prev
                  )
                }
              />
            </div>
          </EditorCard>
        )}

        {/* Typography */}
        {schema.type_scale && (
          <EditorCard>
            <SectionHeader
              title="Typography"
              modified={isModified("type_scale")}
              locked={isLocked("type_scale")}
              onToggleLock={() => toggleLock("type_scale")}
            />
            <div
              className={[
                "flex flex-col gap-3 transition-opacity",
                isLocked("type_scale") ? "pointer-events-none opacity-60" : "",
              ].join(" ")}
            >
              <FieldInput
                label="Typeface"
                value={schema.type_scale.primary_typeface}
                disabled={isLocked("type_scale")}
                onChange={(v) =>
                  setSchema((prev) =>
                    prev?.type_scale
                      ? { ...prev, type_scale: { ...prev.type_scale, primary_typeface: v } }
                      : prev
                  )
                }
              />
              <FieldInput
                label="Weight range"
                value={schema.type_scale.weight_range}
                disabled={isLocked("type_scale")}
                onChange={(v) =>
                  setSchema((prev) =>
                    prev?.type_scale
                      ? { ...prev, type_scale: { ...prev.type_scale, weight_range: v } }
                      : prev
                  )
                }
              />
              <FieldInput
                label="Scale"
                value={schema.type_scale.scale}
                disabled={isLocked("type_scale")}
                onChange={(v) =>
                  setSchema((prev) =>
                    prev?.type_scale
                      ? { ...prev, type_scale: { ...prev.type_scale, scale: v } }
                      : prev
                  )
                }
              />
              <FieldInput
                label="Letter spacing"
                value={schema.type_scale.letter_spacing}
                disabled={isLocked("type_scale")}
                onChange={(v) =>
                  setSchema((prev) =>
                    prev?.type_scale
                      ? { ...prev, type_scale: { ...prev.type_scale, letter_spacing: v as NonNullable<DesignExtraction["type_scale"]>["letter_spacing"] } }
                      : prev
                  )
                }
              />
            </div>
          </EditorCard>
        )}
      </div>

      <Separator />

      {/* Full-width: Text Fields (display-only, lockable) */}
      <EditorCard>
        <SectionHeader
          title={`Text Fields (${schema.text_fields.length.toString()})`}
          modified={isModified("text_fields")}
          locked={isLocked("text_fields")}
          onToggleLock={() => toggleLock("text_fields")}
        />
        {schema.text_fields.length === 0 ? (
          <p className="text-sm text-muted-foreground">No text elements detected</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {schema.text_fields.map((tf, i) => (
              <div
                key={i}
                className="rounded-md border bg-muted/30 p-3 text-sm"
              >
                <p className="font-medium capitalize">{tf.role}</p>
                <p className="mt-1 text-xs text-muted-foreground">{tf.style}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{tf.position}</p>
              </div>
            ))}
          </div>
        )}
      </EditorCard>

      {/* Full-width: Elements (display-only, lockable) */}
      <EditorCard>
        <SectionHeader
          title={`Elements (${schema.elements.length.toString()})`}
          modified={isModified("elements")}
          locked={isLocked("elements")}
          onToggleLock={() => toggleLock("elements")}
        />
        {schema.elements.length === 0 ? (
          <p className="text-sm text-muted-foreground">No visual elements detected</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {schema.elements.map((el, i) => (
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
                <p className="mt-1 text-xs text-muted-foreground">{el.description}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{el.position}</p>
              </div>
            ))}
          </div>
        )}
      </EditorCard>
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

function EditorCard({ children }: { children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2 pt-4" />
      <CardContent className="pb-4 pt-0">{children}</CardContent>
    </Card>
  )
}

function SectionHeader({
  title,
  modified,
  locked,
  onToggleLock,
}: {
  title: string
  modified: boolean
  locked: boolean
  onToggleLock: () => void
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
        {modified && (
          <span
            className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500"
            aria-label="Modified"
          />
        )}
        {locked && (
          <Badge variant="secondary" className="text-xs">
            locked
          </Badge>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-xs"
        onClick={onToggleLock}
      >
        {locked ? "🔒 Unlock" : "🔓 Lock"}
      </Button>
    </div>
  )
}

function FieldInput({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string
  value: string
  disabled: boolean
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 text-sm"
      />
    </div>
  )
}

function ColorInput({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string
  value: string
  disabled: boolean
  onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center gap-3">
      <Label className="w-20 shrink-0 text-xs text-muted-foreground">
        {label}
      </Label>
      <input
        type="color"
        value={value}
        disabled={disabled}
        className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent p-0.5 disabled:cursor-not-allowed disabled:opacity-50"
        onChange={(e) => onChange(e.target.value)}
      />
      <span className="font-mono text-xs text-muted-foreground">{value}</span>
    </div>
  )
}
