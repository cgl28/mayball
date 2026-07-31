export default function LoadingEventPage() {
  return (
    <div className="grid gap-6" aria-live="polite" aria-busy="true">
      <div className="grid gap-2">
        <div className="h-4 w-28 rounded bg-slate-200" />
        <div className="h-8 w-64 max-w-full rounded bg-slate-200" />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="h-24 rounded-md border bg-white" />
        <div className="h-24 rounded-md border bg-white" />
        <div className="h-24 rounded-md border bg-white" />
      </div>
      <div className="h-72 rounded-md border bg-white" />
    </div>
  );
}
