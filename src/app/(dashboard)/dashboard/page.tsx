import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, FileText, TrendingUp, Users } from "lucide-react";

const STATS = [
  { label: "Applications", value: "—", icon: Briefcase },
  { label: "Interviews", value: "—", icon: Users },
  { label: "Offers", value: "—", icon: TrendingUp },
  { label: "Resumes on file", value: "—", icon: FileText },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back — here&apos;s where your job search stands.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {label}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Get started</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Upload a resume to build your base profile, then track applications
          on the Kanban board as you apply.
        </CardContent>
      </Card>
    </div>
  );
}
