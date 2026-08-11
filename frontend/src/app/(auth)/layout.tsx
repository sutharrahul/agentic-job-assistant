import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="p-4 sm:p-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-label text-sm font-bold"
        >
          <span className="size-2 shrink-0 rounded-full bg-purple" />
          Agentic Job Assistant
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-24">
        {children}
      </main>
    </div>
  );
}
