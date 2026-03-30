import Link from "next/link"
import { redirect } from "next/navigation"
import { getSupabaseServer } from "@/lib/supabase-server"
import { Badge } from "@/components/ui/badge"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import type { Project } from "@/types/db"
import AnalyzeTab from "./analyze-tab"
import BlueprintTab from "./blueprint-tab"
import PromptTab from "./prompt-tab"
import OutputTab from "./output-tab"

type PageProps = { params: Promise<{ id: string }> }

export default async function WorkspacePage({ params }: PageProps) {
  const { id } = await params

  const supabase = getSupabaseServer()
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single()

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
            <BlueprintTab projectId={id} />
          </TabsContent>

          <TabsContent value="prompt">
            <PromptTab projectId={id} />
          </TabsContent>

          <TabsContent value="output">
            <OutputTab projectId={id} />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
