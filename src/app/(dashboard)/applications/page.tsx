import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KanbanBoard } from "@/components/applications/kanban-board";

export default function ApplicationsPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 pt-4 sm:px-6 sm:pt-6 lg:px-8 lg:pt-8">
        <div>
          <h1 className="text-2xl font-semibold">Applications</h1>
          <p className="text-muted-foreground">
            Track every application from applied to offer.
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/applications/new" />}>
          <Plus data-icon="inline-start" />
          New application
        </Button>
      </div>
      <KanbanBoard />
    </div>
  );
}
