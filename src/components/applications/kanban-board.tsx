import { KanbanColumn } from "@/components/applications/kanban-column";
import { PlaceholderApplication } from "@/components/applications/application-card";

const COLUMNS: { status: string; title: string }[] = [
  { status: "APPLIED", title: "Applied" },
  { status: "INTERVIEW", title: "Interview" },
  { status: "OFFER", title: "Offer" },
  { status: "REJECTED", title: "Rejected" },
];

const PLACEHOLDER_APPS: Record<string, PlaceholderApplication[]> = {
  APPLIED: [
    { id: "1", company: "Acme Corp", jobTitle: "Frontend Engineer", fitScore: 82 },
    { id: "2", company: "Globex", jobTitle: "Full Stack Developer" },
  ],
  INTERVIEW: [
    { id: "3", company: "Initech", jobTitle: "Backend Engineer", fitScore: 91 },
  ],
  OFFER: [],
  REJECTED: [
    { id: "4", company: "Umbrella Corp", jobTitle: "Software Engineer", fitScore: 64 },
  ],
};

export function KanbanBoard() {
  // One responsive container handles both breakpoints: on mobile there
  // are more columns than fit on screen, so overflow-x-auto makes it
  // scroll (snap-x/snap-mandatory + each column's snap-start below makes
  // that scroll settle on column boundaries, like a carousel). On
  // desktop, four columns usually just fit — same markup, no separate
  // "mobile" vs "desktop" layout to keep in sync.
  return (
    <div className="flex gap-4 overflow-x-auto p-4 sm:p-6 lg:p-8 snap-x snap-mandatory">
      {COLUMNS.map(({ status, title }) => (
        <KanbanColumn
          key={status}
          title={title}
          apps={PLACEHOLDER_APPS[status] ?? []}
        />
      ))}
    </div>
  );
}
