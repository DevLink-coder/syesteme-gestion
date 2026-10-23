import type { jsPDF } from 'jspdf';
import autoTable, { type UserOptions } from 'jspdf-autotable';

export const PDF_CENTER_NAME = 'Centre de répétition';

export function formatPdfDate(date = new Date()): string {
    return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

export function addDocumentHeading(
    pdf: jsPDF,
    title: string,
    details: string[],
    centerName = PDF_CENTER_NAME,
): void {
    const pageWidth = pdf.internal.pageSize.getWidth();
    pdf.setTextColor(31, 41, 55);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.text(centerName, pageWidth / 2, 12, { align: 'center' });
    pdf.setFontSize(16);
    pdf.text(title, pageWidth / 2, 21, {
        align: 'center',
        maxWidth: pageWidth - 20,
    });
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    details.forEach((line, index) => {
        pdf.text(line, pageWidth / 2, 28 + index * 5, {
            align: 'center',
            maxWidth: pageWidth - 20,
        });
    });
}

export function addStructuredTable(pdf: jsPDF, options: UserOptions): void {
    autoTable(pdf, {
        theme: 'grid',
        margin: { top: 12, right: 10, bottom: 14, left: 10 },
        styles: {
            font: 'helvetica',
            fontSize: 10,
            cellPadding: 2.5,
            lineColor: [190, 195, 202],
            lineWidth: 0.2,
            textColor: [31, 41, 55],
            overflow: 'linebreak',
        },
        headStyles: {
            fillColor: [232, 235, 239],
            textColor: [31, 41, 55],
            fontStyle: 'bold',
            lineColor: [175, 181, 190],
            lineWidth: 0.2,
        },
        ...options,
    });
}

export function addDocumentFooters(pdf: jsPDF, date = formatPdfDate()): void {
    const totalPages = pdf.getNumberOfPages();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    for (let page = 1; page <= totalPages; page += 1) {
        pdf.setPage(page);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(100, 105, 112);
        pdf.text(`Généré automatiquement — ${date}`, 10, pageHeight - 6);
        pdf.text(
            `Page ${page} / ${totalPages}`,
            pageWidth - 10,
            pageHeight - 6,
            {
                align: 'right',
            },
        );
    }
}

export function formatPdfTime(value: string | undefined | null): string {
    return value ? value.slice(0, 5) : '';
}

export function minutesBetween(start: string, end: string): number {
    const toMinutes = (value: string) => {
        const [hours, minutes] = value.slice(0, 5).split(':').map(Number);
        return hours * 60 + minutes;
    };
    return Math.max(0, toMinutes(end) - toMinutes(start));
}
