"use client";

import { useGetEntityFiles, useDeleteFile } from "@/features/files/api/use-files";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, Trash, FileIcon } from "lucide-react";
import { format } from "date-fns";
import { apiClient } from "@/lib/api/client";

interface FileListProps {
    entityType: string; // e.g., 'Lead', 'Account'
    entityId: string;
}

export function FileList({ entityType, entityId }: FileListProps) {
    const { data: files = [], isLoading } = useGetEntityFiles(entityType, entityId);
    const deleteFile = useDeleteFile();

    if (isLoading) return <div>Loading files...</div>;

    const handleDownload = async (id: string, fileName: string) => {
        // Direct download using blob
        try {
            const response = await apiClient.get(`/files/${id}/download`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
        } catch (e) {
            console.error("Download failed", e);
            alert("Download failed");
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Delete file?")) {
            await deleteFile.mutateAsync(id);
        }
    }

    return (
        <div className="border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[50px]"></TableHead>
                        <TableHead>Filename</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {files.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">No files attached.</TableCell>
                        </TableRow>
                    ) : (
                        files.map((file) => (
                            <TableRow key={file._id}>
                                <TableCell><FileIcon className="h-4 w-4 text-muted-foreground" /></TableCell>
                                <TableCell className="font-medium">{file.original_filename}</TableCell>
                                <TableCell>{(file.file_size / 1024).toFixed(1)} KB</TableCell>
                                <TableCell>{file.created_at ? format(new Date(file.created_at), 'MMM d, yyyy') : '-'}</TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button variant="ghost" size="sm" onClick={() => handleDownload(file._id, file.original_filename)}>
                                        <Download className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(file._id)}>
                                        <Trash className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
