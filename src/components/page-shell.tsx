export function PageShell({
  title,
  purpose,
  children,
}: {
  title: string;
  purpose: string;
  children?: React.ReactNode;
}) {
  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-10 max-w-3xl w-full mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted">{purpose}</p>
      </div>
      {children}
    </main>
  );
}
