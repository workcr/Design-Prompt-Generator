import Link from "next/link"
import { redirect } from "next/navigation"
import { getDb } from "@/lib/db"
import { Badge } from "@/components/ui/badge"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import type { Project } from "@/types/db"
import AnalyzeTab from "./analyze-tab"

type PageProps = { params: Promise<{ id: string }> }

export default async function WorkspacePage({ params }: PageProps) {
  const { id } = await params

  const project = getDb()
    .prepare("SELECT * FROM projects WHERE id = ?")
    .get(id) as Project | undefined

  if (!project) {
    redirect("/")
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-4">
          <Link
            href="/"
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Back to dashboard"
          >
            ←
          </Link>
          <h1 className="flex-1 truncate text-lg font-semibold">
            {project.name}
          </h1>
          <Badge
            variant={project.status === "active" ? "default" : "secondary"}
            className="text-xs"
          >
            {project.status}
          </Badge>
        </div>
      </header>

      {/* Workspace */}
      <div className="mx-auto max-w-6xl px-6 py-6">
        <Tabs defaultValue="analyze">
          <TabsList className="mb-6">
            <TabsTrigger value="analyze">Analyze</TabsTrigger>
            <TabsTrigger value="blueprint">Blueprint</TabsTrigger>
            <TabsTrigger value="prompt">Prompt</TabsTrigger>
            <TabsTrigger value="output">Output</TabsTrigger>
          </TabsList>

          <TabsContent value="analyze">
            <AnalyzeTab projectId={id} />
          </TabsContent>

          <TabsContent value="blueprint">
            <PlaceholderTab
              phase="Phase 3"
              description="Paste reference prompts from your target prompt family to distill a reusable grammar blueprint."
            />
          </TabsContent>

          <TabsContent value="prompt">
            <PlaceholderTab
              phase="Phase 4 / 5"
              description="Edit and lock schema fields, then generate the final prompt by merging the design schema with the grammar blueprint."
            />
          </TabsContent>

          <TabsContent value="output">
            <PlaceholderTab
              phase="Phase 6"
              description="Send the final prompt to Nano Banana 2 or Replicate and compare the generated image against the original reference."
            />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}

function PlaceholderTab({
  phase,
  description,
}: {
  phase: string
  description: string
}) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {phase}
      </p>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        {description}
      </p>
    </div>
  )
}
