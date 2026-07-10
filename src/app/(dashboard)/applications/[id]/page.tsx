import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <Link
        href="/applications"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to board
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Application {id}</h1>
        <Badge variant="outline">Applied</Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Job description</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Job description will appear here.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fit score</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Not analyzed yet.
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Cover letter</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Not generated yet.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Skill gaps</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Not analyzed yet.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
