"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { Project } from "@/types/db"

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    void loadProjects()
  }, [])

  async function loadProjects() {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch("/api/projects")
      if (!res.ok) throw new Error("Failed to load projects")
      const data = (await res.json()) as Project[]
      setProjects(data)
    } catch {
      setError("Could not load projects. Is the dev server running?")
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    try {
      setSubmitting(true)
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      })
      if (!res.ok) throw new Error("Failed to create project")
      const project = (await res.json()) as Project
      setProjects((prev) => [project, ...prev])
      setNewName("")
      setCreating(false)
    } catch {
      setError("Failed to create project.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      setProjects((prev) => prev.filter((p) => p.id !== id))
    } catch {
      setError("Failed to delete project.")
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Design Prompt Generator
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Your projects
            </p>
          </div>
          {!creating && (
            <Button onClick={() => setCreating(true)}>New Project</Button>
          )}
        </div>

        {/* Inline create form */}
        {creating && (
          <form
            onSubmit={(e) => void handleCreate(e)}
            className="mb-6 flex items-center gap-3 rounded-lg border bg-card p-4"
          >
            <Input
              autoFocus
              placeholder="Project name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="max-w-sm"
              disabled={submitting}
            />
            <Button type="submit" disabled={submitting || !newName.trim()}>
              {submitting ? "Creating…" : "Create"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setCreating(false)
                setNewName("")
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
          </form>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Loading projects…
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && projects.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-muted-foreground">No projects yet.</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setCreating(true)}
            >
              Create your first project
            </Button>
          </div>
        )}

        {/* Project grid */}
        {!loading && projects.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Card key={project.id} className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-snug">
                      {project.name}
                    </CardTitle>
                    <Badge
                      variant={
                        project.status === "active" ? "default" : "secondary"
                      }
                      className="shrink-0 text-xs"
                    >
                      {project.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 pb-2">
                  <p className="text-xs text-muted-foreground">
                    Created{" "}
                    {new Date(project.created_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </CardContent>
                <CardFooter className="flex gap-2 pt-2">
                  <Link
                    href={`/projects/${project.id}`}
                    className={cn(buttonVariants({ size: "sm" }), "flex-1")}
                  >
                    Open
                  </Link>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => void handleDelete(project.id, project.name)}
                  >
                    Delete
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
