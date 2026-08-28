"use client";

import { useState, useRef } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUploadFile } from "@/features/files/api/use-files";
import { toast } from "sonner";

interface FileUploaderProps {
    entityType?: string;
    entityId?: string;
    onUploadComplete?: () => void;
}

export function FileUploader({ entityType, entityId, onUploadComplete }: FileUploaderProps) {
    const [dragActive, setDragActive] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const uploadFile = useUploadFile();

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setSelectedFile(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        try {
            await uploadFile.mutateAsync({
                file: selectedFile,
                fileable_type: entityType,
                fileable_id: entityId
            });
            setSelectedFile(null);
            toast.success("File uploaded");
            if (onUploadComplete) onUploadComplete();
        } catch (error: any) {
            console.error("Upload failed", error);
            // Surface the backend's reason (e.g. unsupported type, too large)
            // instead of a generic failure, so the user knows what to fix.
            const detail = error?.response?.data?.detail;
            toast.error(
                typeof detail === "string"
                    ? detail
                    : "Upload failed. Please try a supported file type (PDF, image, Office doc, CSV, ZIP)."
            );
        }
    };

    return (
        <div className="space-y-4">
            <div
                className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-md transition-colors ${dragActive ? "border-primary bg-primary/10" : "border-muted-foreground/25"}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                {selectedFile ? (
                    <div className="flex items-center gap-4">
                        <span className="font-medium text-sm">{selectedFile.name}</span>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedFile(null)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                ) : (
                    <div className="text-center">
                        <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground mb-2">Drag & Drop or</p>
                        <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
                            Select File
                        </Button>
                        <input
                            ref={inputRef}
                            type="file"
                            className="hidden"
                            onChange={handleChange}
                        />
                    </div>
                )}
            </div>
            {selectedFile && (
                <div className="flex justify-end">
                    <Button onClick={handleUpload} disabled={uploadFile.isPending}>
                        {uploadFile.isPending ? "Uploading..." : "Upload"}
                    </Button>
                </div>
            )}
        </div>
    );
}
