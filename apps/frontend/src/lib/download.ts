/**
 * Trigger a browser download for a Blob (e.g. CSV/XLSX export responses).
 */
export function saveBlob(data: Blob, filename: string) {
    const url = URL.createObjectURL(data);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
