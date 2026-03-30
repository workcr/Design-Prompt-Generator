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
}

interface GeneratedImageItem {
  id: string
  prompt_output_id: string
  provider: string
  url: string | null
  status: string
  created_at: string
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OutputTab({ projectId }: { projectId: string }) {
  const [loadPhase, setLoadPhase] = useState<LoadPhase>("loading")
  const [promptOutput, setPromptOutput] = useState<PromptOutputItem | null>(null)
  const [generatedImage, setGeneratedImage] = useState<GeneratedImageItem | null>(null)
  const [imagePhase, setImagePhase] = useState<ImagePhase>("none")
  const [imageError, setImageError] = useState("")

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
      const output = (await res.json()) as PromptOutputItem
      setPromptOutput(output)

      // Load existing generated image if any
      const imgRes = await fetch(`/api/generated-images?outputId=${output.id}`)
      if (imgRes.ok) {
        const img = (await imgRes.json()) as GeneratedImageItem
        setGeneratedImage(img)
        setImagePhase("complete")
      }

      setLoadPhase("ready")
    } catch {
      setLoadPhase("error")
    }
  }

  async function generate() {
    if (!promptOutput) return
    setImagePhase("generating")
    setImageError("")
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outputId: promptOutput.id }),
      })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        setImageError(data.error ?? "Generation failed.")
        setImagePhase("error")
        return
      }
      const data = (await res.json()) as GeneratedImageItem
      setGeneratedImage(data)
      setImagePhase("complete")
    } catch {
      setImageError("Generation failed. Check the dev server.")
      setImagePhase("error")
    }
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

  if (!promptOutput) return null

  // ── Render: ready ────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">
      {/* Prompt preview */}
      <div className="rounded-lg border p-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Latest Prompt
        </h3>
        <p className="line-clamp-4 font-mono text-sm leading-relaxed text-muted-foreground">
          {promptOutput.final_prompt ?? "—"}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {new Date(promptOutput.created_at).toLocaleString()}
        </p>
      </div>

      {/* Side-by-side comparison */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Reference image */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Reference
          </p>
          {promptOutput.reference_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/uploads/${promptOutput.reference_image}`}
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
          {imagePhase === "complete" && generatedImage?.url ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={generatedImage.url}
                alt="Generated image"
                className="w-full rounded-lg border object-cover"
              />
              <span className="absolute bottom-2 right-2 rounded-md bg-background/80 px-2 py-0.5 text-xs font-medium backdrop-blur-sm">
                {generatedImage.provider === "nano_banana_2"
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

      {/* Regenerate — shown after first image */}
      {imagePhase === "complete" && (
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void generate()}
          >
            Regenerate
          </Button>
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
