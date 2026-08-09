import Link from "next/link";
import { AlertCircle, Download, FileText, ShieldAlert, Upload } from "lucide-react";
import { uploadDocumentAction, voidDocumentAction } from "@/app/events/[eventId]/documents/actions";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { VisibleDocument } from "@/lib/documents/data";
import { allowedDocumentTypes, MAX_DOCUMENT_BYTES } from "@/lib/documents/validation";
import type { Enums } from "@/src/types/database.generated";

const categories: Enums<"document_category">[] = ["quote", "contract", "invoice", "receipt", "supporting", "other"];

function label(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ") : "Not set";
}

function dateTime(value: string | null | undefined) {
  return value ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Not set";
}

function sizeLabel(bytes: number | string | null | undefined) {
  const value = Number(bytes ?? 0);
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  if (value >= 1024) return `${Math.ceil(value / 1024)} KB`;
  return `${value} B`;
}

function actorName(document: VisibleDocument) {
  return document.uploaded_by_preferred_name ?? document.uploaded_by_display_name ?? "Unknown user";
}

function Message({
  error,
  uploaded,
  voided,
}: {
  error?: string;
  uploaded?: boolean;
  voided?: boolean;
}) {
  if (error) {
    return (
      <div role="alert" className="flex gap-2 rounded-md border border-destructive/40 p-3 text-sm text-destructive">
        <AlertCircle className="mt-0.5 h-4 w-4" aria-hidden="true" />
        <p>{error}</p>
      </div>
    );
  }
  if (uploaded || voided) {
    return (
      <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-950">
        {uploaded ? "Document uploaded and finalised." : "Document voided. The history row remains available."}
      </div>
    );
  }
  return null;
}

export function ReadOnlyDocumentsNotice() {
  return (
    <div className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
      <ShieldAlert className="mt-0.5 h-4 w-4" aria-hidden="true" />
      <p>Existing documents can be downloaded for this read-only event, but uploads and voiding are disabled.</p>
    </div>
  );
}

export function DocumentUploadForm({
  eventId,
  requestId,
  revisionId,
  paymentId,
  canUpload,
  readOnly,
}: {
  eventId: string;
  requestId?: string | null;
  revisionId?: string | null;
  paymentId?: string | null;
  canUpload: boolean;
  readOnly: boolean;
}) {
  if (!canUpload || readOnly) return null;

  return (
    <form action={uploadDocumentAction} className="grid gap-4 rounded-md border p-4">
      <input type="hidden" name="eventId" value={eventId} />
      {requestId ? <input type="hidden" name="requestId" value={requestId} /> : null}
      {revisionId ? <input type="hidden" name="revisionId" value={revisionId} /> : null}
      {paymentId ? <input type="hidden" name="paymentId" value={paymentId} /> : null}
      <div className="flex items-center gap-2">
        <Upload className="h-4 w-4" aria-hidden="true" />
        <h3 className="font-medium">Upload document</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Maximum size {Math.floor(MAX_DOCUMENT_BYTES / (1024 * 1024))} MB. Accepted types: PDF, JPEG, PNG and DOCX.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Category</span>
          <select name="category" defaultValue="supporting" className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
            {categories.map((category) => <option key={category} value={category}>{label(category)}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">File</span>
          <input
            name="file"
            type="file"
            required
            accept={allowedDocumentTypes.join(",")}
            className="rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </label>
        <label className="grid gap-1 text-sm md:col-span-2">
          <span className="font-medium">Description</span>
          <textarea name="description" rows={2} maxLength={1000} className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
        </label>
      </div>
      <div>
        <SubmitButton pendingLabel="Uploading...">Upload and finalise</SubmitButton>
      </div>
    </form>
  );
}

export function DocumentsTable({
  eventId,
  requestId,
  documents,
  canVoid,
  readOnly,
}: {
  eventId: string;
  requestId?: string | null;
  documents: VisibleDocument[];
  canVoid: boolean;
  readOnly: boolean;
}) {
  if (documents.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        No documents are visible for this scope.
      </p>
    );
  }

  return (
    <div className="max-w-full overflow-x-auto">
      <table className="w-full min-w-[68rem] text-left text-sm">
        <thead className="border-b text-muted-foreground">
          <tr>
            <th className="py-2 pr-4 font-medium">File</th>
            <th className="py-2 pr-4 font-medium">Category</th>
            <th className="py-2 pr-4 font-medium">Parent</th>
            <th className="py-2 pr-4 font-medium">Uploaded by</th>
            <th className="py-2 pr-4 font-medium">State</th>
            <th className="py-2 pr-4 font-medium">Size</th>
            <th className="py-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((document) => (
            <tr key={document.document_id} className="border-b last:border-b-0">
              <td className="py-3 pr-4">
                <p className="font-medium">{document.original_filename}</p>
                <p className="text-muted-foreground">{document.mime_type}</p>
                {document.description ? <p className="mt-1 text-muted-foreground">{document.description}</p> : null}
              </td>
              <td className="py-3 pr-4">{label(document.category)}</td>
              <td className="py-3 pr-4">
                {document.request_code ? (
                  <Link className="underline-offset-4 hover:underline" href={`/events/${eventId}/requests/${document.request_id}`}>
                    {document.request_code} revision {document.revision_number}
                  </Link>
                ) : document.payment_code ? `Payment ${document.payment_code}` : "Event record"}
              </td>
              <td className="py-3 pr-4">{actorName(document)}<br /><span className="text-muted-foreground">{dateTime(document.finalized_at ?? document.created_at)}</span></td>
              <td className="py-3 pr-4">
                <Badge variant={document.status === "voided" ? "secondary" : "default"}>{label(document.status)}</Badge>
                {document.visibility_scope === "private_draft" ? <p className="mt-1 text-muted-foreground">Private draft</p> : null}
                {document.void_reason ? <p className="mt-1 text-muted-foreground">Voided: {document.void_reason}</p> : null}
              </td>
              <td className="py-3 pr-4">{sizeLabel(document.size_bytes)}</td>
              <td className="py-3">
                <div className="grid gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/events/${eventId}/documents/${document.document_id}/download`}>
                      <Download className="h-4 w-4" aria-hidden="true" />
                      Download
                    </Link>
                  </Button>
                  {canVoid && !readOnly && document.status === "finalised" ? (
                    <form action={voidDocumentAction} className="grid gap-2">
                      <input type="hidden" name="eventId" value={eventId} />
                      {requestId ? <input type="hidden" name="requestId" value={requestId} /> : null}
                      <input type="hidden" name="documentId" value={document.document_id ?? ""} />
                      <label className="sr-only" htmlFor={`reason-${document.document_id}`}>Void reason</label>
                      <input id={`reason-${document.document_id}`} name="reason" placeholder="Reason" required className="w-40 rounded-md border bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                      <SubmitButton variant="outline" pendingLabel="Voiding...">Void</SubmitButton>
                    </form>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DocumentsPanel({
  eventId,
  documents,
  count,
  page,
  pageSize,
  canUpload,
  canVoid,
  readOnly,
  error,
  uploaded,
  voided,
}: {
  eventId: string;
  documents: VisibleDocument[];
  count: number;
  page: number;
  pageSize: number;
  canUpload: boolean;
  canVoid: boolean;
  readOnly: boolean;
  error?: string;
  uploaded?: boolean;
  voided?: boolean;
}) {
  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-normal">
            <FileText className="h-6 w-6" aria-hidden="true" />
            Documents
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Supporting documents are stored in a private bucket. Downloads are authorised at request time and use short-lived signed access.
          </p>
        </div>
      </div>
      <Message error={error} uploaded={uploaded} voided={voided} />
      {readOnly ? <ReadOnlyDocumentsNotice /> : null}

      <form className="grid gap-3 rounded-md border p-4 md:grid-cols-4">
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Filename search</span>
          <input name="search" className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Category</span>
          <select name="category" defaultValue="all" className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
            <option value="all">All categories</option>
            {categories.map((category) => <option key={category} value={category}>{label(category)}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">State</span>
          <select name="status" defaultValue="all" className="rounded-md border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
            <option value="all">All states</option>
            <option value="finalised">Finalised</option>
            <option value="voided">Voided</option>
          </select>
        </label>
        <div className="self-end">
          <Button type="submit" variant="outline">Filter</Button>
        </div>
      </form>

      <section className="rounded-md border p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-medium">Visible documents</h2>
          <p className="text-sm text-muted-foreground">Showing {documents.length} of {count}</p>
        </div>
        <DocumentsTable eventId={eventId} documents={documents} canVoid={canVoid} readOnly={readOnly} />
        <div className="mt-4 flex flex-wrap gap-2">
          {page > 1 ? <Button asChild variant="outline"><Link href={`/events/${eventId}/documents?page=${page - 1}`}>Previous</Link></Button> : null}
          {page * pageSize < count ? <Button asChild variant="outline"><Link href={`/events/${eventId}/documents?page=${page + 1}`}>Next</Link></Button> : null}
        </div>
      </section>

      {canUpload ? (
        <section>
          <DocumentUploadForm eventId={eventId} canUpload={false} readOnly={readOnly} />
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            Uploads are available from a request or payment record so the document inherits the correct visibility.
          </p>
        </section>
      ) : null}
    </div>
  );
}

export function RequestDocumentsSection({
  eventId,
  requestId,
  revisionId,
  documents,
  canUpload,
  canVoid,
  readOnly,
  error,
  uploaded,
  voided,
}: {
  eventId: string;
  requestId: string;
  revisionId: string | null;
  documents: VisibleDocument[];
  canUpload: boolean;
  canVoid: boolean;
  readOnly: boolean;
  error?: string;
  uploaded?: boolean;
  voided?: boolean;
}) {
  return (
    <section className="rounded-md border p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-medium">Documents</h2>
          <p className="mt-1 text-sm text-muted-foreground">Documents inherit this request revision&apos;s visibility.</p>
        </div>
        <Button asChild variant="outline" size="sm"><Link href={`/events/${eventId}/documents`}>Document library</Link></Button>
      </div>
      <Message error={error} uploaded={uploaded} voided={voided} />
      {readOnly ? <div className="mt-4"><ReadOnlyDocumentsNotice /></div> : null}
      <div className="mt-4">
        <DocumentsTable eventId={eventId} requestId={requestId} documents={documents} canVoid={canVoid} readOnly={readOnly} />
      </div>
      <div className="mt-4">
        <DocumentUploadForm
          eventId={eventId}
          requestId={requestId}
          revisionId={revisionId}
          canUpload={canUpload && Boolean(revisionId)}
          readOnly={readOnly}
        />
      </div>
    </section>
  );
}
