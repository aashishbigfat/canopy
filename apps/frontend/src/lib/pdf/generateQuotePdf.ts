"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";

export interface QuoteData {
    quote_number: string;
    title?: string;
    status: string;
    valid_until?: string;
    created_at: string;
    account_name?: string;
    contact_name?: string;
    contact_email?: string;
    subtotal: number;
    discount_percent?: number;
    discount_amount?: number;
    tax_percent?: number;
    tax_amount?: number;
    total: number;
    terms_and_conditions?: string;
    items: QuoteItem[];
}

export interface QuoteItem {
    id: string;
    product_name: string;
    description?: string;
    quantity: number;
    unit_price: number;
    discount_percent?: number;
    total: number;
}

export function generateQuotePdf(quote: QuoteData, companyName: string = "Tutterfly") {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    let yPos = 20;

    // Header
    doc.setFontSize(24);
    doc.setTextColor(33, 37, 41);
    doc.text(companyName, 20, yPos);

    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    doc.text("QUOTE", pageWidth - 20, yPos, { align: "right" });
    yPos += 15;

    // Quote Info
    doc.setFontSize(10);
    doc.setTextColor(33, 37, 41);

    doc.text(`Quote Number: ${quote.quote_number}`, 20, yPos);
    doc.text(`Date: ${formatDate(quote.created_at)}`, pageWidth - 20, yPos, { align: "right" });
    yPos += 6;

    if (quote.valid_until) {
        doc.text(`Valid Until: ${formatDate(quote.valid_until)}`, 20, yPos);
    }
    doc.text(`Status: ${quote.status.toUpperCase()}`, pageWidth - 20, yPos, { align: "right" });
    yPos += 15;

    // Title
    if (quote.title) {
        doc.setFontSize(16);
        doc.setTextColor(33, 37, 41);
        doc.text(quote.title, 20, yPos);
        yPos += 12;
    }

    // Bill To section
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("BILL TO:", 20, yPos);
    yPos += 6;
    doc.setTextColor(33, 37, 41);
    if (quote.account_name) {
        doc.text(quote.account_name, 20, yPos);
        yPos += 5;
    }
    if (quote.contact_name) {
        doc.text(quote.contact_name, 20, yPos);
        yPos += 5;
    }
    if (quote.contact_email) {
        doc.text(quote.contact_email, 20, yPos);
        yPos += 5;
    }
    yPos += 10;

    // Line Items Table
    const tableData = quote.items.map((item, index) => [
        index + 1,
        item.product_name,
        item.description || "",
        item.quantity,
        formatCurrency(item.unit_price),
        item.discount_percent ? `${item.discount_percent}%` : "-",
        formatCurrency(item.total),
    ]);

    autoTable(doc, {
        startY: yPos,
        head: [["#", "Product", "Description", "Qty", "Unit Price", "Discount", "Total"]],
        body: tableData,
        theme: "striped",
        headStyles: {
            fillColor: [59, 130, 246],
            textColor: 255,
            fontStyle: "bold"
        },
        columnStyles: {
            0: { cellWidth: 10 },
            1: { cellWidth: 35 },
            2: { cellWidth: 45 },
            3: { cellWidth: 15, halign: "center" },
            4: { cellWidth: 25, halign: "right" },
            5: { cellWidth: 20, halign: "center" },
            6: { cellWidth: 25, halign: "right" },
        },
        margin: { left: 20, right: 20 },
    });

    // Get final Y position after table
    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Totals Section
    const totalsX = pageWidth - 90;
    doc.setFontSize(10);

    // Subtotal
    doc.text("Subtotal:", totalsX, yPos);
    doc.text(formatCurrency(quote.subtotal), pageWidth - 20, yPos, { align: "right" });
    yPos += 6;

    // Discount
    if (quote.discount_amount && quote.discount_amount > 0) {
        doc.text(`Discount (${quote.discount_percent || 0}%):`, totalsX, yPos);
        doc.text(`-${formatCurrency(quote.discount_amount)}`, pageWidth - 20, yPos, { align: "right" });
        yPos += 6;
    }

    // Tax
    if (quote.tax_amount && quote.tax_amount > 0) {
        doc.text(`Tax (${quote.tax_percent || 0}%):`, totalsX, yPos);
        doc.text(formatCurrency(quote.tax_amount), pageWidth - 20, yPos, { align: "right" });
        yPos += 6;
    }

    // Total
    yPos += 2;
    doc.setDrawColor(200, 200, 200);
    doc.line(totalsX, yPos, pageWidth - 20, yPos);
    yPos += 6;

    doc.setFontSize(12);
    doc.setFont(undefined as any, "bold");
    doc.text("TOTAL:", totalsX, yPos);
    doc.text(formatCurrency(quote.total), pageWidth - 20, yPos, { align: "right" });
    yPos += 15;

    // Terms and Conditions
    if (quote.terms_and_conditions) {
        doc.setFont(undefined as any, "normal");
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text("Terms & Conditions:", 20, yPos);
        yPos += 5;
        doc.setTextColor(33, 37, 41);
        const splitTerms = doc.splitTextToSize(quote.terms_and_conditions, pageWidth - 40);
        doc.text(splitTerms, 20, yPos);
    }

    // Footer
    const footerY = doc.internal.pageSize.height - 20;
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
        `Generated by ${companyName} CRM on ${formatDateTime(new Date().toISOString())}`,
        pageWidth / 2,
        footerY,
        { align: "center" }
    );

    // Save the PDF
    doc.save(`quote-${quote.quote_number}.pdf`);
}



export default generateQuotePdf;
