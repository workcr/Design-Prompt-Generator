"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"

// ─── Types ────────────────────────────────────────────────────────────────────

type LoadPhase = "loading" | "empty" | "ready" | "error"
type ImagePhase = "none" | "generating" | "complete" | "error"

interface PromptOutputItem {
  id: string
  final_prompt: string | null
  model_used: string | null
  created_at: string
  reference_image: string | null
  image_url: string | null
  image_provider: string | null
}

interface GenerateResponse {
  id: string
  url: string
  provider: string
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OutputTab({ projectId }: { projectId: string }) {
  const [loadPhase, setLoadPhase] = useState<LoadPhase>("loading")
  const [outputs, setOutputs] = useState<PromptOutputItem[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [imagePhase, setImagePhase] = useState<ImagePhase>("none")
  const [imageError, setImageError] = useState("")
  const [copied, setCopied] = useState(false)

  // Derived — guarded for noUncheckedIndexedAccess
  const activeOutput: PromptOutputItem | null = outputs[activeIndex] ?? null

  useEffect(() => {
    void loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  async function loadData() {
    setLoadPhase("loading")
    setImageError("")
    try {
      const res = await fetch(`/api/prompt-outputs?projectId=${projectId}`)
      if (res.status === 404) {
        setLoadPhase("empty")
        return
      }
      if (!res.ok) {
        setLoadPhase("error")
        return
      }
      const data = (await res.json()) as PromptOutputItem[]
      setOutputs(data)
      setActiveIndex(0)
      const first = data[0]
      setImagePhase(first?.image_url ? "complete" : "none")
      setLoadPhase("ready")
    } catch {
      setLoadPhase("error")
    }
  }

  function handleSelectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const idx = Number(e.target.value)
    setActiveIndex(idx)
    const selected = outputs[idx]
    setImagePhase(selected?.image_url ? "complete" : "none")
    setImageError("")
  }

  async function generate() {
    if (!activeOutput) return
    setImagePhase("generating")
    setImageError("")
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outputId: activeOutput.id }),
      })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        setImageError(data.error ?? "Generation failed.")
        setImagePhase("error")
        return
      }
      const data = (await res.json()) as GenerateResponse
      setOutputs(prev =>
        prev.map((o, i) =>
          i === activeIndex
            ? { ...o, image_url: data.url, image_provider: data.provider }
            : o
        )
      )
      setImagePhase("complete")
    } catch {
      setImageError("Generation failed. Check the dev server.")
      setImagePhase("error")
    }
  }

  async function copyPrompt() {
    const text = activeOutput?.final_prompt ?? ""
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // execCommand fallback for non-HTTPS / restricted contexts
      const ta = document.createElement("textarea")
      ta.value = text
      ta.style.position = "fixed"
      ta.style.opacity = "0"
      document.body.appendChild(ta)
      ta.select()
      document.execCommand("copy")
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Render: loading ──────────────────────────────────────────────────────────

  if (loadPhase === "loading") {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-lg border p-12 text-center">
        <Spinner />
        <p className="text-sm text-muted-foreground">Loading output…</p>
      </div>
    )
  }

  // ── Render: empty ────────────────────────────────────────────────────────────

  if (loadPhase === "empty") {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <p className="font-medium">No prompt generated yet</p>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Generate a prompt in the{" "}
          <span className="font-medium">Prompt</span> tab first.
        </p>
      </div>
    )
  }

  // ── Render: error ────────────────────────────────────────────────────────────

  if (loadPhase === "error") {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-4 rounded-lg border border-destructive/50 bg-destructive/5 p-12 text-center">
        <p className="font-medium text-destructive">Failed to load output</p>
        <Button variant="outline" onClick={() => void loadData()}>
          Retry
        </Button>
      </div>
    )
  }

  if (!activeOutput) return null

  // ── Render: ready ────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">
      {/* History selector — only when more than 1 output */}
      {outputs.length > 1 && (
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            History
          </label>
          <select
            value={activeIndex}
            onChange={handleSelectChange}
            className="rounded-md border bg-background px-3 py-1.5 text-sm"
          >
            {outputs.map((o, i) => (
              <option key={o.id} value={i}>
                {new Date(o.created_at).toLocaleString()}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Prompt preview */}
      <div className="rounded-lg border p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Prompt
          </h3>
          <Button variant="outline" size="sm" onClick={() => void copyPrompt()}>
            {copied ? "Copied!" : "Copy Prompt"}
          </Button>
        </div>
        <p className="line-clamp-4 font-mono text-sm leading-relaxed text-muted-foreground">
          {activeOutput.final_prompt ?? "—"}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {new Date(activeOutput.created_at).toLocaleString()}
        </p>
      </div>

      {/* Side-by-side comparison */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Reference image */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Reference
          </p>
          {activeOutput.reference_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/uploads/${activeOutput.reference_image}`}
              alt="Reference design"
              className="w-full rounded-lg border object-cover"
            />
          ) : (
            <div className="flex min-h-48 items-center justify-center rounded-lg border border-dashed">
              <p className="text-sm text-muted-foreground">No reference image</p>
            </div>
          )}
        </div>

        {/* Generated image */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Generated
          </p>
          {imagePhase === "complete" && activeOutput.image_url ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeOutput.image_url}
                alt="Generated image"
                className="w-full rounded-lg border object-cover"
              />
              <span className="absolute bottom-2 right-2 rounded-md bg-background/80 px-2 py-0.5 text-xs font-medium backdrop-blur-sm">
                {activeOutput.image_provider === "nano_banana_2"
                  ? "Nano Banana 2"
                  : "Replicate"}
              </span>
            </div>
          ) : imagePhase === "generating" ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border">
              <Spinner />
              <p className="text-sm text-muted-foreground">Generating…</p>
            </div>
          ) : (
            <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed">
              <Button onClick={() => void generate()}>Generate Image</Button>
              {imageError && (
                <p className="text-xs text-destructive">{imageError}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Actions row — shown after first image */}
      {imagePhase === "complete" && activeOutput.image_url && (
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void generate()}
          >
            Regenerate
          </Button>
          <a
            href={activeOutput.image_url}
            download
            className="inline-flex items-center justify-center rounded-md border bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent"
          >
            Download
          </a>
          {imageError && (
            <p className="text-xs text-destructive">{imageError}</p>
          )}
        </div>
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
