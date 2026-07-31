export default function LoadingAppPage() {
  return (
    <div className="grid gap-6" aria-live="polite" aria-busy="true">
      <div className="h-6 w-32 rounded bg-slate-200" />
      <div className="grid gap-3 md:grid-cols-2">
        <div className="h-32 rounded-md border bg-white" />
        <div className="h-32 rounded-md border bg-white" />
      </div>
      <div className="h-48 rounded-md border bg-white" />
    </div>
  );
}
