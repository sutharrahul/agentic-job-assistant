import { ApplicationDetail } from "@/components/applications/application-detail";

// Thin server wrapper: Next 16 delivers route params as a Promise, so we
// unwrap here and hand the plain id to the client component (which owns
// all the interactive state).
export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ApplicationDetail id={id} />;
}
