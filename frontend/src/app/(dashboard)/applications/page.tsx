import { PageHeading } from "@/components/layout/page-heading";
import { KanbanBoard } from "@/components/applications/kanban-board";

// No action button in the header here — KanbanBoard renders its own
// "Add application" button in its toolbar row, alongside the Board/List
// switcher and the application count, since all three need `apps`,
// which this component doesn't fetch.
export default function ApplicationsPage() {
  return (
    <div className="flex h-full flex-col">
      <PageHeading crumbs={["Workspace", "Tracker"]} title="Tracker" />
      <KanbanBoard />
    </div>
  );
}
