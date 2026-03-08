"use client";

import { FileUploader } from "@/features/files/components/file-uploader";

export default function NewFilePage() {
    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Upload File</h2>
            </div>
            <div className="rounded-md border p-4 max-w-xl">
                <FileUploader onUploadComplete={() => alert("File uploaded!")} />
            </div>
        </div>
    );
}
