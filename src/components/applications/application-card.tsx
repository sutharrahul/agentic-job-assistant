import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface PlaceholderApplication {
  id: string;
  company: string;
  jobTitle: string;
  fitScore?: number;
}

export function ApplicationCard({ app }: { app: PlaceholderApplication }) {
  return (
    <Link href={`/applications/${app.id}`}>
      <Card className="transition-colors hover:bg-secondary/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{app.company}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between pb-4">
          <span className="text-sm text-muted-foreground">
            {app.jobTitle}
          </span>
          {app.fitScore !== undefined && (
            <Badge variant="secondary">{app.fitScore}% fit</Badge>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
