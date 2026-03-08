"use client";

import { FileUploader } from "@/features/files/components/file-uploader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function FilesPage() {
    // Note: Since there is no global 'list all files' endpoint in the current backend API,
    // this page focuses on the Upload capability. In a real scenario, we would add a global list endpoint.
    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Files</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>File Management</CardTitle>
                        <CardDescription>
                            Manage your files here. Note: To see files associated with specific records (Leads, Accounts), visit their respective pages.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border p-4 bg-muted/50 text-center text-muted-foreground h-[200px] flex items-center justify-center">
                            Select a module to view its files
                            <br />
                            (Global file list not available in this version)
                        </div>
                    </CardContent>
                </Card>
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Quick Upload</CardTitle>
                        <CardDescription>Upload a file to the system storage.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <FileUploader onUploadComplete={() => alert("File uploaded successfully!")} />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
