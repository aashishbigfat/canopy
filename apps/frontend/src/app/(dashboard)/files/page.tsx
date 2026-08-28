"use client";

import { FileUploader } from "@/features/files/components/file-uploader";
import { useGetMyFiles, useDeleteFile } from "@/features/files/api/use-files";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Trash, FileIcon, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/format";
import { apiClient } from "@/lib/api/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function FilesPage() {
    const { data, isLoading } = useGetMyFiles({ page: 1, per_page: 100 });
    const files = data?.files ?? [];
    const deleteFile = useDeleteFile();
    const queryClient = useQueryClient();

    const handleDownload = async (id: string, fileName: string) => {
        try {
            const response = await apiClient.get(`/files/${id}/download`, { responseType: "blob" });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", fileName);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch {
            toast.error("Download failed");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this file?")) return;
        try {
            await deleteFile.mutateAsync(id);
            toast.success("File deleted");
        } catch {
            toast.error("Delete failed");
        }
    };

    return (
        <div className="flex-1 space-y-4 p-4 sm:p-8 pt-4 sm:pt-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Files</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>My Files{data ? ` (${data.total})` : ""}</CardTitle>
                        <CardDescription>
                            Files you uploaded. Files attached to a specific record (Lead, Account, …) also appear on that record&apos;s page.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[40px]"></TableHead>
                                        <TableHead>Filename</TableHead>
                                        <TableHead>Size</TableHead>
                                        <TableHead>Linked to</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center">
                                                <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                                            </TableCell>
                                        </TableRow>
                                    ) : files.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                                No files uploaded yet.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        files.map((file) => (
                                            <TableRow key={file.id}>
                                                <TableCell><FileIcon className="h-4 w-4 text-muted-foreground" /></TableCell>
                                                <TableCell className="font-medium">{file.original_filename}</TableCell>
                                                <TableCell className="whitespace-nowrap">{(file.file_size / 1024).toFixed(1)} KB</TableCell>
                                                <TableCell>
                                                    {file.fileable_type
                                                        ? <Badge variant="secondary">{file.fileable_type}</Badge>
                                                        : <span className="text-xs text-muted-foreground">Drive</span>}
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap">{file.created_at ? formatDate(file.created_at) : "-"}</TableCell>
                                                <TableCell className="space-x-1 text-right">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Download" onClick={() => handleDownload(file.id, file.original_filename)}>
                                                        <Download className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Delete" onClick={() => handleDelete(file.id)}>
                                                        <Trash className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Quick Upload</CardTitle>
                        <CardDescription>Upload a file to your Drive (stored in S3).</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <FileUploader
                            onUploadComplete={() => {
                                queryClient.invalidateQueries({ queryKey: ["files"] });
                                toast.success("File uploaded");
                            }}
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
