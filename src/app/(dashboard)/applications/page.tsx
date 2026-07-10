import { KanbanBoard } from "@/components/applications/kanban-board";

export default function ApplicationsPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pt-4 sm:px-6 sm:pt-6 lg:px-8 lg:pt-8">
        <h1 className="text-2xl font-semibold">Applications</h1>
        <p className="text-muted-foreground">
          Track every application from applied to offer.
        </p>
      </div>
      <KanbanBoard />
    </div>
  );
}
