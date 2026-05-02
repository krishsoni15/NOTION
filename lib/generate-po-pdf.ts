import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { POData, numberToWords } from "../components/purchase/purchase-order-template";

async function fetchImageWithDimensions(src: string): Promise<{ dataUrl: string, width: number, height: number } | null> {
    const tryFetch = async (url: string) => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
        const blob = await res.blob();
        return await new Promise<{ dataUrl: string, width: number, height: number }>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const dataUrl = String(reader.result);
                const img = new Image();
                img.onload = () => {
                    resolve({ dataUrl, width: img.width, height: img.height });
                };
                img.onerror = () => reject(new Error("Failed to load image for dimensions"));
                img.src = dataUrl;
            };
            reader.onerror = () => reject(new Error("Failed to read image blob"));
            reader.readAsDataURL(blob);
        });
    };

    try {
        return await tryFetch(src);
    } catch {
        try {
            const proxyUrl = `/api/download?url=${encodeURIComponent(src)}&filename=image`;
            return await tryFetch(proxyUrl);
        } catch {
            return null;
        }
    }
}

export async function generateNativePOPdf(data: POData): Promise<jsPDF> {
    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 8;
    const usableWidth = pageWidth - margin * 2;
    let currentY = margin;

    // Load Header Image
    const headerImg = await fetchImageWithDimensions("/images/logos/PDF_Data.png");
    if (headerImg) {
        // Maintain aspect ratio: width = usableWidth
        const imgHeight = (usableWidth / headerImg.width) * headerImg.height;
        doc.addImage(headerImg.dataUrl, "PNG", margin, currentY, usableWidth, imgHeight, undefined, "FAST");
        currentY += imgHeight + 5;
    } else {
        currentY += 20; // fallback spacing if image fails
    }

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("PURCHASE ORDER", pageWidth / 2, currentY, { align: "center" });
    currentY += 8;

    // Info Section
    doc.setFontSize(9);
    const poDate = format(new Date(data.createdAt), "dd-MMM-yyyy");
    const validDate = data.validTill ? format(new Date(data.validTill), "dd-MMM-yyyy") : "-";

    const leftX = margin;
    const rightX = pageWidth - margin;

    // Left Side: Vendor Info
    doc.setFont("helvetica", "bold");
    doc.text("To :", leftX, currentY);
    let leftY = currentY + 4;
    doc.setFontSize(10);
    const companyNameLines = doc.splitTextToSize(data.vendor?.companyName?.toUpperCase() || "", usableWidth / 2 - 5);
    doc.text(companyNameLines, leftX, leftY);
    leftY += companyNameLines.length * 4;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    if (data.vendor?.contactName) {
        doc.text(data.vendor.contactName, leftX, leftY);
        leftY += 4;
    }
    if (data.vendor?.address) {
        const addrLines = doc.splitTextToSize(data.vendor.address, usableWidth / 2 - 5);
        doc.text(addrLines, leftX, leftY);
        leftY += addrLines.length * 4;
    }
    if (data.vendor?.gstNumber) {
        doc.text(`GSTIN : ${data.vendor.gstNumber}`, leftX, leftY);
        leftY += 4;
    }
    if (data.vendor?.phone) {
        doc.text(`Phone : ${data.vendor.phone}`, leftX, leftY);
        leftY += 4;
    }
    if (data.vendor?.email) {
        doc.text(`Email : ${data.vendor.email}`, leftX, leftY);
        leftY += 4;
    }

    // Right Side: PO Info
    let rightY = currentY;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.text("Original / Duplicate / Triplicate", rightX, rightY, { align: "right" });
    rightY += 4;
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`PO No. : ${data.poNumber}`, rightX, rightY, { align: "right" });
    rightY += 4;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Date : ${poDate}`, rightX, rightY, { align: "right" });
    rightY += 4;
    
    doc.setFont("helvetica", "bold");
    doc.text(`Valid Till : ${validDate}`, rightX, rightY, { align: "right" });
    rightY += 5;
    
    doc.text("GSTIN : 24AAPCN9948H1Z4", rightX, rightY, { align: "right" });
    rightY += 4;

    currentY = Math.max(leftY, rightY) + 5;

    // Pre-process items
    let totalTaxable = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalAmount = 0;

    const taxGroups: Record<string, { taxable: number, cgst: number, sgst: number, cgstRate: number, sgstRate: number }> = {};

    const tableBody = [];
    const itemImages: Record<number, { dataUrl: string, width: number, height: number }> = {};

    for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i];
        const basis = item.perUnitBasis || 1;
        const qty = item.quantity;
        const rate = item.unitRate;
        const discountPercent = item.discountPercent || 0;

        const baseValue = (qty / basis) * rate;
        const discountValue = (baseValue * discountPercent) / 100;
        const taxableValue = baseValue - discountValue;

        const gstRate = item.gstTaxRate;
        const cgstRate = gstRate / 2;
        const sgstRate = gstRate / 2;

        const cgstAmount = (taxableValue * cgstRate) / 100;
        const sgstAmount = (taxableValue * sgstRate) / 100;
        const itemTotal = taxableValue + cgstAmount + sgstAmount;

        totalTaxable += taxableValue;
        totalCGST += cgstAmount;
        totalSGST += sgstAmount;
        totalAmount += itemTotal;

        const key = `${item.hsnSacCode || 'NA'}-${item.gstTaxRate}`;
        if (!taxGroups[key]) {
            taxGroups[key] = { taxable: 0, cgst: 0, sgst: 0, cgstRate, sgstRate };
        }
        taxGroups[key].taxable += taxableValue;
        taxGroups[key].cgst += cgstAmount;
        taxGroups[key].sgst += sgstAmount;

        let description = item.itemDescription || "Item";
        
        // Load image if available
        if (item.imageUrl) {
            const imgData = await fetchImageWithDimensions(item.imageUrl);
            if (imgData) {
                itemImages[i] = imgData;
                // Add blank lines to make room for the image dynamically. We'll size it to take up some space.
                description += "\n\n\n\n\n\n\n"; 
            }
        }

        tableBody.push([
            (i + 1).toString(),
            description,
            item.hsnSacCode || '-',
            item.quantity.toString(),
            item.unit,
            item.unitRate.toFixed(2),
            item.discountPercent > 0 ? `${item.discountPercent}%` : '0.00%',
            taxableValue.toFixed(2),
            `${cgstRate}%`,
            `${sgstRate}%`,
            itemTotal.toFixed(2)
        ]);
    }

    // Items Table
    const tableStartY = currentY;
    autoTable(doc, {
        startY: tableStartY,
        head: [['No.', 'Item & Description', 'HSN/SAC', 'Qty', 'Unit', 'Rate(Rs)', 'Disc.', 'Taxable', 'CGST', 'SGST', 'Amount(Rs)']],
        body: tableBody,
        theme: 'plain',
        styles: { 
            fontSize: 8, 
            cellPadding: 4, 
            valign: 'middle', 
            textColor: [0, 0, 0] 
        },
        headStyles: { 
            fillColor: [249, 250, 251], 
            fontStyle: 'bold', 
            halign: 'center',
            minCellHeight: 15, // Force header height to prevent wrapping
            valign: 'middle'
        },
        bodyStyles: {
            valign: 'middle' // Ensure all body cells are vertically centered
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 10 }, // No. - Fixed width
            1: { halign: 'left', cellWidth: 'auto' }, // Description - Auto width
            2: { halign: 'center', cellWidth: 15 }, // HSN/SAC - Fixed width
            3: { halign: 'center', cellWidth: 15, fontStyle: 'bold' }, // Qty - Fixed width
            4: { halign: 'center', cellWidth: 15 }, // Unit - Fixed width
            5: { halign: 'right', cellWidth: 20 }, // Rate - Fixed width
            6: { halign: 'right', cellWidth: 15 }, // Disc - Fixed width
            7: { halign: 'right', cellWidth: 20, fontStyle: 'bold' }, // Taxable - Fixed width
            8: { halign: 'right', cellWidth: 15 }, // CGST - Fixed width
            9: { halign: 'right', cellWidth: 15 }, // SGST - Fixed width
            10: { halign: 'right', cellWidth: 22, fontStyle: 'bold' }, // Amount - Fixed width
        },
        didParseCell: (data) => {
            // Pre-calculate row height for image cells BEFORE drawing
            if (data.section === 'body' && data.column.index === 1) {
                const rowIndex = data.row.index;
                const imgInfo = itemImages[rowIndex];
                if (imgInfo) {
                    // Calculate required height for image with padding
                    const cell = data.cell;
                    const textHeight = 12; // Approximate height for 1-2 lines of text
                    const padding = 6; // Top and bottom padding
                    
                    // Calculate image dimensions
                    const maxImgW = cell.width - padding * 2;
                    let imgHeight = (maxImgW / imgInfo.width) * imgInfo.height;
                    
                    // Limit max image height
                    const maxImgH = 40;
                    if (imgHeight > maxImgH) {
                        imgHeight = maxImgH;
                    }
                    
                    // Set minimum cell height to accommodate text + image + padding
                    const requiredHeight = textHeight + imgHeight + padding * 2;
                    data.cell.styles.minCellHeight = Math.max(requiredHeight, data.cell.styles.minCellHeight || 0);
                }
            }
        },
        willDrawCell: (data) => {
            // Draw internal cell borders (right and bottom), but skip outer edges
            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(0.2);
            // Draw bottom line if it's not the last row
            if (data.row.index < data.table.body.length - 1 || data.section === 'head') {
                doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
            }
            // Draw right line if it's not the last column
            if (data.column.index < data.table.columns.length - 1) {
                doc.line(data.cell.x + data.cell.width, data.cell.y, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
            }
        },
        didDrawCell: (data) => {
            if (data.section === 'body' && data.column.index === 1) {
                const rowIndex = data.row.index;
                const imgInfo = itemImages[rowIndex];
                if (imgInfo) {
                    const cell = data.cell;
                    
                    // Calculate text height (first 1-2 lines)
                    const textHeight = 12;
                    
                    const padding = 3;
                    const maxImgW = cell.width - padding * 2;
                    const maxImgH = cell.height - textHeight - padding * 2;

                    if (maxImgH > 0 && maxImgW > 0) {
                        let finalW = maxImgW;
                        let finalH = (maxImgW / imgInfo.width) * imgInfo.height;

                        // Limit to max height
                        if (finalH > maxImgH) {
                            finalH = maxImgH;
                            finalW = (maxImgH / imgInfo.height) * imgInfo.width;
                        }

                        // Center the image in available space, below the text
                        const imgX = cell.x + padding + (maxImgW - finalW) / 2;
                        const imgY = cell.y + textHeight + padding + (maxImgH - finalH) / 2;

                        try {
                            doc.addImage(imgInfo.dataUrl, "JPEG", imgX, imgY, finalW, finalH, undefined, "FAST");
                        } catch(e) {
                            try {
                                doc.addImage(imgInfo.dataUrl, "PNG", imgX, imgY, finalW, finalH, undefined, "FAST");
                            } catch(e2) {}
                        }
                    }
                }
            }
        }
    });

    // Draw Rounded Rectangle around the Main Table
    const tableFinalY = (doc as any).lastAutoTable.finalY;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, tableStartY, usableWidth, tableFinalY - tableStartY, 3, 3, 'S');

    currentY = tableFinalY + 5;

    // Totals Section
    const roundOff = Math.round(totalAmount) - totalAmount;
    const finalGrandTotal = Math.round(totalAmount);
    
    if (currentY + 40 > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        currentY = margin;
    }

    const totalsStartY = currentY;
    autoTable(doc, {
        startY: totalsStartY,
        body: [
            [
                { content: `Total Purchase Order Amount in Words :\n\n${numberToWords(finalGrandTotal).toUpperCase()}`, styles: { fontStyle: 'bold', halign: 'left' } },
                { content: `Total Amount before Tax (Rs)\nAdd CGST (Rs)\nAdd SGST (Rs)\nRound Off (Rs)\nGrand Total (Rs)`, styles: { halign: 'left' } },
                { content: `${totalTaxable.toFixed(2)}\n${totalCGST.toFixed(2)}\n${totalSGST.toFixed(2)}\n${roundOff.toFixed(2)}\n${finalGrandTotal.toFixed(2)}`, styles: { halign: 'right', fontStyle: 'bold' } }
            ]
        ],
        theme: 'plain',
        styles: { fontSize: 8, cellPadding: 4, valign: 'middle', textColor: [0,0,0] },
        columnStyles: {
            0: { cellWidth: usableWidth * 0.6 },
            1: { cellWidth: usableWidth * 0.25 },
            2: { cellWidth: usableWidth * 0.15 }
        },
        willDrawCell: (data) => {
            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(0.2);
            if (data.column.index < data.table.columns.length - 1) {
                doc.line(data.cell.x + data.cell.width, data.cell.y, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
            }
        }
    });

    const totalsFinalY = (doc as any).lastAutoTable.finalY;
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, totalsStartY, usableWidth, totalsFinalY - totalsStartY, 3, 3, 'S');

    currentY = totalsFinalY + 5;

    if (currentY + 60 > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        currentY = margin;
    }

    // Bottom block: Notes + Tax Table (Left 60%), Signature (Right 40%)
    const bottomBlockWidth = usableWidth * 0.6 - 2;
    
    // Notes & Tax container
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, currentY, bottomBlockWidth, 60, 3, 3, 'S');
    
    doc.setFont("helvetica", "bold");
    doc.text("Notes :", margin + 2, currentY + 4);
    doc.setFont("helvetica", "normal");
    doc.text(data.site?.name?.toUpperCase() || "", margin + 2, currentY + 9);
    if (data.creator?.role === "purchase_officer") {
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        doc.text(`Created by: ${data.creator.fullName}`, margin + 2, currentY + 14);
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(8);
    }

    // Tax Table inside notes box
    const taxBody = Object.entries(taxGroups).map(([key, val]) => {
        const [hsn] = key.split('-');
        return [
            hsn,
            val.taxable.toFixed(2),
            `${val.cgstRate}%`,
            val.cgst.toFixed(2),
            `${val.sgstRate}%`,
            val.sgst.toFixed(2)
        ];
    });

    autoTable(doc, {
        startY: currentY + 18,
        head: [['HSN/SAC', 'Taxable (Rs)', 'CGST%', 'CGST (Rs)', 'SGST%', 'SGST (Rs)']],
        body: taxBody,
        theme: 'grid',
        tableWidth: bottomBlockWidth - 4,
        margin: { left: margin + 2 },
        styles: { fontSize: 7, cellPadding: 3, valign: 'middle', lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0,0,0] },
        headStyles: { fillColor: [243, 244, 246], fontStyle: 'bold', halign: 'center' },
        columnStyles: {
            0: { halign: 'center' },
            1: { halign: 'right' },
            2: { halign: 'center' },
            3: { halign: 'right' },
            4: { halign: 'center' },
            5: { halign: 'right' }
        }
    });

    // Signature Box (Right 40%)
    const sigXOffset = margin + usableWidth * 0.6 + 2;
    const sigWidth = usableWidth * 0.4 - 2;
    
    doc.setLineWidth(0.3);
    doc.roundedRect(sigXOffset, currentY, sigWidth, 60, 3, 3, 'S');
    
    const sigX = sigXOffset + sigWidth / 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("For, NOTION ELECTRONICS PVT LTD", sigX, currentY + 5, { align: "center" });

    // Signature Image
    if (data.approver?.signatureUrl) {
        const sigImg = await fetchImageWithDimensions(data.approver.signatureUrl);
        if (sigImg) {
            // Keep aspect ratio
            const maxSigW = 40;
            const maxSigH = 20;
            let finalW = maxSigW;
            let finalH = (maxSigW / sigImg.width) * sigImg.height;

            if (finalH > maxSigH) {
                finalH = maxSigH;
                finalW = (maxSigH / sigImg.height) * sigImg.width;
            }
            doc.addImage(sigImg.dataUrl, "PNG", sigX - (finalW / 2), currentY + 15, finalW, finalH, undefined, "FAST");
        }
    } else if (data.approver) {
        doc.setFont("times", "italic");
        doc.setFontSize(14);
        doc.text(data.approver.fullName, sigX, currentY + 25, { align: "center" });
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.text(data.approver.fullName, sigX, currentY + 30, { align: "center" });
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Authorised Signatory", sigX, currentY + 55, { align: "center" });
    
    // Draw top border for authorised signatory - SHRINK by 5 units on each side
    doc.setLineWidth(0.2);
    doc.line(sigXOffset + 5, currentY + 50, sigXOffset + sigWidth - 5, currentY + 50);

    // Footer
    currentY += 65;
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text("This is a computer-generated purchase order. E. & O. E.", margin, currentY);

    return doc;
}
