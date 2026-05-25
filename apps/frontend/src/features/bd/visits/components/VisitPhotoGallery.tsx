"use client";

import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Loader2, Camera, Trash2, X } from "lucide-react";

interface Photo {
  file_id: string;
  filename: string;
  mime_type: string;
  size: number;
  presigned_url: string | null;
  created_at?: string;
}

interface Props {
  visitId: string;
  canEdit?: boolean;
}

export function VisitPhotoGallery({ visitId, canEdit = true }: Props) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [zoom, setZoom] = useState<Photo | null>(null);

  const reload = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get<Photo[]>(`/bd-visits/${visitId}/photos`);
      setPhotos(data);
    } catch {
      toast.error("Failed to load photos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitId]);

  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      // Upload sequentially so we can surface per-file errors clearly.
      for (let i = 0; i < files.length; i++) {
        const fd = new FormData();
        fd.append("file", files[i]);
        await apiClient.post(`/bd-visits/${visitId}/photos`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      toast.success(`${files.length} photo(s) uploaded`);
      await reload();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const remove = async (fileId: string) => {
    try {
      await apiClient.delete(`/bd-visits/${visitId}/photos/${fileId}`);
      toast.success("Photo removed");
      setPhotos((p) => p.filter((x) => x.file_id !== fileId));
    } catch {
      toast.error("Delete failed");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Photos {photos.length > 0 && `(${photos.length})`}</p>
        {canEdit && (
          <>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              className="hidden"
              onChange={(e) => upload(e.target.files)}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : (
                <Camera className="h-3.5 w-3.5 mr-1" />
              )}
              Add Photo
            </Button>
          </>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : photos.length === 0 ? (
        <p className="text-xs text-muted-foreground">No photos uploaded yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {photos.map((p) => (
            <div key={p.file_id} className="group relative aspect-square rounded-md overflow-hidden border bg-muted">
              {p.presigned_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.presigned_url}
                  alt={p.filename}
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => setZoom(p)}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                  {p.filename}
                </div>
              )}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => remove(p.file_id)}
                  className="absolute top-1 right-1 p-1 rounded bg-black/60 text-white opacity-0 group-hover:opacity-100 transition"
                  aria-label="Remove photo"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {zoom && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setZoom(null)}
        >
          <button
            type="button"
            onClick={() => setZoom(null)}
            className="absolute top-4 right-4 p-2 rounded bg-white/10 text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          {zoom.presigned_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={zoom.presigned_url}
              alt={zoom.filename}
              className="max-w-full max-h-full object-contain"
            />
          )}
        </div>
      )}
    </div>
  );
}
