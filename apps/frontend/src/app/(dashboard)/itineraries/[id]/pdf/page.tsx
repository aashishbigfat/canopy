"use client";

import { use, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  itineraryExtrasService,
  type PDFJob,
} from "@/lib/api/services/itineraries-extra.service";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, Download } from "lucide-react";

export default function ItineraryPDFPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [job, setJob] = useState<PDFJob | null>(null);
  const [busy, setBusy] = useState(false);
  const pollRef = useRef<any>(null);

  async function request() {
    setBusy(true);
    try {
      const j = await itineraryExtrasService.requestPdf({ itinerary_id: id });
      setJob(j);
      poll(j.id);
    } catch {
      toast.error("Request failed");
    } finally {
      setBusy(false);
    }
  }

  function poll(jobId: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const j = await itineraryExtrasService.pdfStatus(jobId);
        setJob(j);
        if (j.status === "done" || j.status === "failed") {
          clearInterval(pollRef.current);
          if (j.status === "done") toast.success("PDF ready");
          if (j.status === "failed") toast.error(j.error || "Render failed");
        }
      } catch {}
    }, 2000);
  }

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  return (
    <div className="p-6 max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Itinerary PDF</h1>
        <p className="text-sm text-muted-foreground">
          Generate the printable / shareable PDF for this itinerary.
        </p>
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        <Button onClick={request} disabled={busy || job?.status === "rendering"}>
          {(busy || job?.status === "rendering") && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          <FileText className="mr-2 h-4 w-4" />
          {job ? "Re-generate" : "Generate PDF"}
        </Button>

        {job && (
          <div className="text-sm">
            <div>
              Status: <span className="font-medium">{job.status}</span>
            </div>
            {job.error && <div className="text-red-600">{job.error}</div>}
            {job.pdf_url && (
              <a href={job.pdf_url} target="_blank" rel="noreferrer" className="mt-2 inline-block">
                <Button size="sm" variant="outline">
                  <Download className="mr-1 h-3 w-3" />
                  Download
                </Button>
              </a>
            )}
          </div>
        )}
      </div>

      {job?.pdf_url && (
        <iframe
          src={job.pdf_url}
          className="h-[70vh] w-full rounded-lg border"
          title="PDF preview"
        />
      )}
    </div>
  );
}
