import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  upload: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn((url: string) => {
    const error = new Error("NEXT_REDIRECT");
    Object.assign(error, { digest: "NEXT_REDIRECT", url });
    throw error;
  }),
}));

vi.mock("@/lib/auth/session", () => ({
  getAuthenticatedSession: vi.fn(async () => ({
    supabase: {
      rpc: mocks.rpc,
      storage: { from: vi.fn(() => ({ upload: mocks.upload })) },
    },
  })),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { uploadDocumentAction } from "@/app/events/[eventId]/documents/actions";

describe("document server actions", () => {
  beforeEach(() => {
    mocks.rpc.mockReset();
    mocks.upload.mockReset();
    mocks.revalidatePath.mockReset();
    mocks.redirect.mockClear();
  });

  it("returns to the request with fresh data without broad cache invalidation", async () => {
    mocks.rpc
      .mockResolvedValueOnce({ data: [{ bucket_id: "event-documents", object_path: "event-id/document-id", document_id: "document-id" }], error: null })
      .mockResolvedValueOnce({ error: null });
    mocks.upload.mockResolvedValueOnce({ error: null });

    const formData = new FormData();
    formData.set("eventId", "event-id");
    formData.set("requestId", "request-id");
    formData.set("category", "quote");
    formData.set("file", new File(["quote"], "quote.pdf", { type: "application/pdf" }));

    await expect(uploadDocumentAction(formData)).rejects.toMatchObject({ digest: "NEXT_REDIRECT" });

    expect(mocks.rpc).toHaveBeenNthCalledWith(1, "begin_document_upload", expect.objectContaining({ p_request_id: "request-id" }));
    expect(mocks.rpc).toHaveBeenNthCalledWith(2, "finalise_document_upload", expect.objectContaining({ p_document_id: "document-id" }));
    expect(mocks.redirect).toHaveBeenLastCalledWith("/events/event-id/requests/request-id?documentUploaded=1");
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("accepts an Excel workbook through the ordinary private upload path", async () => {
    mocks.rpc
      .mockResolvedValueOnce({ data: [{ bucket_id: "event-documents", object_path: "event-id/document-id", document_id: "document-id" }], error: null })
      .mockResolvedValueOnce({ error: null });
    mocks.upload.mockResolvedValueOnce({ error: null });

    const formData = new FormData();
    formData.set("eventId", "event-id");
    formData.set("requestId", "request-id");
    formData.set("category", "supporting");
    formData.set("file", new File(["workbook"], "budget.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));

    await expect(uploadDocumentAction(formData)).rejects.toMatchObject({ digest: "NEXT_REDIRECT" });

    expect(mocks.rpc).toHaveBeenNthCalledWith(1, "begin_document_upload", expect.objectContaining({
      p_mime_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      p_original_filename: "budget.xlsx",
    }));
    expect(mocks.upload).toHaveBeenCalledWith(expect.any(String), expect.any(File), expect.objectContaining({
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }));
  });

  it("continues to reject unsupported file types before creating an upload intent", async () => {
    const formData = new FormData();
    formData.set("eventId", "event-id");
    formData.set("requestId", "request-id");
    formData.set("file", new File(["script"], "script.js", { type: "application/javascript" }));

    await expect(uploadDocumentAction(formData)).rejects.toMatchObject({ digest: "NEXT_REDIRECT" });

    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenLastCalledWith(expect.stringContaining("documentsError=Unsupported+file+type"));
  });
});
