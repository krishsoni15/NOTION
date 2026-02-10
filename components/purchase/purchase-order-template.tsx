"use client";

import { format } from "date-fns";

export interface POData {
    poNumber: string;
    createdAt: number;
    validTill?: number;
    vendor?: {
        companyName: string;
        contactName?: string;
        address?: string;
        gstNumber?: string;
        phone?: string;
        email?: string;
    } | null;
    site?: {
        name: string;
    } | null;
    creator?: {
        fullName: string;
        role: string;
    } | null;
    approver?: {
        fullName: string;
        signatureUrl?: string; // Manager's signature image
    } | null;
    items: Array<{
        _id: string;
        itemDescription: string;
        hsnSacCode?: string;
        quantity: number;
        unit: string;
        unitRate: number;
        discountPercent: number;
        gstTaxRate: number;
        perUnitBasis?: number;
    }>;
}

// Helper to convert number to words (Indian numbering system)
function numberToWords(num: number): string {
    const a = [
        "",
        "one ",
        "two ",
        "three ",
        "four ",
        "five ",
        "six ",
        "seven ",
        "eight ",
        "nine ",
        "ten ",
        "eleven ",
        "twelve ",
        "thirteen ",
        "fourteen ",
        "fifteen ",
        "sixteen ",
        "seventeen ",
        "eighteen ",
        "nineteen ",
    ];
    const b = [
        "",
        "",
        "twenty",
        "thirty",
        "forty",
        "fifty",
        "sixty",
        "seventy",
        "eighty",
        "ninety",
    ];

    const [int, dec] = num.toFixed(2).split('.');
    const paddedInt = ("0000000000" + int).slice(-10); // Ensure exactly 10 digits for integer part
    const n = (paddedInt + "." + dec).match(/^(\d{1})(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})(?:\.(\d{2}))?$/);

    if (!n) return "";

    let str = "";
    str += Number(n[1]) !== 0 ? (a[Number(n[1])] || b[Number(n[1][0])] + " " + a[Number(n[1][1])]) + "crore " : "";
    str += Number(n[2]) !== 0 ? (a[Number(n[2])] || b[Number(n[2][0])] + " " + a[Number(n[2][1])]) + "lakh " : "";
    str += Number(n[3]) !== 0 ? (a[Number(n[3])] || b[Number(n[3][0])] + " " + a[Number(n[3][1])]) + "thousand " : "";
    str += Number(n[4]) !== 0 ? (a[Number(n[4])] || b[Number(n[4][0])] + " " + a[Number(n[4][1])]) + "hundred " : "";

    const lastTwo = Number(n[5] + n[6]); // Combine hundreds digit position? Wait. 
    // n[5] is single digit, n[6] is two digits.
    // The regex groups:
    // 1: digit (crore tens? no, 10 digit total. 10^9 max? 100 crore?)
    // 2: 2 digits (crore)
    // 3: 2 digits (lakh)
    // 4: 2 digits (thousand)
    // 5: 1 digit (hundred)
    // 6: 2 digits (tens/units)

    // n[5] corresponds to Hundred position.
    str += Number(n[5]) !== 0 ? (str !== "" ? "and " : "") + (a[Number(n[5])] || b[Number(n[5][0])] + " " + a[Number(n[5][1])]) + "hundred " : "";

    // n[6] corresponds to last two digits (00-99).
    const lastPart = Number(n[6]);
    str += lastPart !== 0 ? (str !== "" || Number(n[5]) !== 0 ? "and " : "") + (a[lastPart] || b[Number(n[6][0])] + " " + a[Number(n[6][1])]) : "";

    str += "Rupees Only";

    // Add paise if needed, but 'only' usually implies integer. 
    // If decimals exist:
    // User typically wants "Rupees X Only" or "Rupees X and Y Paise Only".
    // Existing code did: `str += Number(n[6]) !== 0 ? "paise " ... : "only";`
    // Let's stick closer to the intent but fix logic.

    return "Rupees " + capitalize(str.trim());
}

function capitalize(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

export function PurchaseOrderTemplate({ data }: { data: POData }) {
    // Current Date
    const poDate = format(new Date(data.createdAt), "dd-MMM-yyyy");
    const validDate = data.validTill ? format(new Date(data.validTill), "dd-MMM-yyyy") : "-";

    // Calculate Totals
    let totalTaxable = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalAmount = 0;

    const processedItems = data.items.map((item) => {
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

        return {
            ...item,
            taxableValue,
            cgstRate,
            cgstAmount,
            sgstRate,
            sgstAmount,
            itemTotal
        };
    });

    const roundOff = Math.round(totalAmount) - totalAmount;
    const finalGrandTotal = Math.round(totalAmount);

    // Group Tax Data
    const taxGroups: Record<string, { taxable: number, cgst: number, sgst: number, cgstRate: number, sgstRate: number }> = {};

    processedItems.forEach(item => {
        const key = `${item.hsnSacCode || 'NA'}-${item.gstTaxRate}`;
        if (!taxGroups[key]) {
            taxGroups[key] = {
                taxable: 0,
                cgst: 0,
                sgst: 0,
                cgstRate: item.cgstRate,
                sgstRate: item.sgstRate
            };
        }
        taxGroups[key].taxable += item.taxableValue;
        taxGroups[key].cgst += item.cgstAmount;
        taxGroups[key].sgst += item.sgstAmount;
    });

    return (
        <div className="bg-white text-[#000000] font-sans text-xs" style={{ width: '210mm', minHeight: '297mm', padding: '10mm', margin: '0 auto', boxSizing: 'border-box' }}>
            {/* PO Content */}
            <div className="w-full bg-white">

                {/* Header */}
                <div className="text-center mb-6">
                    <div className="flex justify-center items-center">
                        <img
                            src="/images/logos/PDF_Data.png"
                            alt="NOTION ELECTRONICS"
                            style={{ width: '100%', height: '280px', objectFit: 'fill' }}
                        />
                    </div>
                </div>

                {/* Title */}
                <div className="text-center mb-4">
                    <h3 className="text-lg font-bold uppercase">PURCHASE ORDER</h3>
                </div>

                {/* Info Section */}
                <div className="flex justify-between text-[10px] mb-4">
                    {/* To: Vendor */}
                    <div className="w-[48%]">
                        <div className="font-bold mb-1">To :</div>
                        <div className="font-bold uppercase text-sm">{data.vendor?.companyName}</div>
                        {data.vendor?.contactName && <div>{data.vendor.contactName}</div>}
                        <div className="whitespace-pre-wrap">{data.vendor?.address}</div>
                        {data.vendor?.gstNumber && <div>GSTIN : {data.vendor.gstNumber}</div>}
                        {data.vendor?.phone && <div>Phone : {data.vendor.phone}</div>}
                        {data.vendor?.email && <div>Email : {data.vendor.email}</div>}
                    </div>

                    {/* Date/PO No */}
                    <div className="w-[48%] text-right">
                        <div className="mb-2 italic text-[9px]">Original / Duplicate / Triplicate</div>
                        <div className="font-bold text-sm">PO No. : {data.poNumber}</div>
                        <div>Date : {poDate}</div>
                        <div className="font-bold">Valid Till : {validDate}</div>
                        <div className="mt-1 font-bold">GSTIN : 24AAPCN9948H1Z4</div>
                    </div>
                </div>

                {/* Items Table */}
                <table className="w-full border-collapse border border-[#000000] text-[10px] mb-2">
                    <thead>
                        <tr style={{ backgroundColor: '#f9fafb' }}>
                            <th className="border border-[#000000] p-1 text-center w-[30px]">No.</th>
                            <th className="border border-[#000000] p-1 text-left">Item & Description</th>
                            <th className="border border-[#000000] p-1 text-center w-[60px]">HSN / SAC</th>
                            <th className="border border-[#000000] p-1 text-center w-[40px]">Qty</th>
                            <th className="border border-[#000000] p-1 text-center w-[40px]">Unit</th>
                            <th className="border border-[#000000] p-1 text-right w-[60px]">Rate (₹)</th>
                            <th className="border border-[#000000] p-1 text-right w-[50px]">Discount</th>
                            <th className="border border-[#000000] p-1 text-right w-[70px]">Taxable (₹)</th>
                            <th className="border border-[#000000] p-1 text-right w-[40px]">CGST</th>
                            <th className="border border-[#000000] p-1 text-right w-[40px]">SGST</th>
                            <th className="border border-[#000000] p-1 text-right w-[80px]">Amount (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {processedItems.map((item, idx) => (
                            <tr key={item._id}>
                                <td className="border border-[#000000] p-1 text-center font-bold">{idx + 1}</td>
                                <td className="border border-[#000000] p-1">
                                    <div className="font-bold uppercase">{item.itemDescription?.split('\n')[0] || "Item"}</div>
                                    <div className="text-[9px] whitespace-pre-line" style={{ color: '#4b5563' }}>{item.itemDescription}</div>
                                </td>
                                <td className="border border-[#000000] p-1 text-center">{item.hsnSacCode || '-'}</td>
                                <td className="border border-[#000000] p-1 text-center font-bold">{item.quantity}</td>
                                <td className="border border-[#000000] p-1 text-center">{item.unit}</td>
                                <td className="border border-[#000000] p-1 text-right">{item.unitRate.toFixed(2)}</td>
                                <td className="border border-[#000000] p-1 text-right">{item.discountPercent > 0 ? `${item.discountPercent}%` : '0.00%'}</td>
                                <td className="border border-[#000000] p-1 text-right font-bold">{item.taxableValue.toFixed(2)}</td>
                                <td className="border border-[#000000] p-1 text-right">{item.cgstRate}%</td>
                                <td className="border border-[#000000] p-1 text-right">{item.sgstRate}%</td>
                                <td className="border border-[#000000] p-1 text-right font-bold">{item.itemTotal.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Totals Section */}
                <div className="flex border border-[#000000] text-[10px] mb-2">
                    <div className="w-[60%] border-r border-[#000000] p-2 flex flex-col justify-between">
                        <div>
                            <div className="font-bold underline mb-1">Total Purchase Order Amount in Words :</div>
                            <div className="font-bold italic uppercase">{numberToWords(finalGrandTotal)}</div>
                        </div>
                    </div>
                    <div className="w-[40%]">
                        <div className="flex justify-between border-b p-1" style={{ borderColor: '#d1d5db' }}>
                            <span>Total Amount before Tax (₹)</span>
                            <span className="font-bold">{totalTaxable.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between border-b p-1" style={{ borderColor: '#d1d5db' }}>
                            <span>Add CGST (₹)</span>
                            <span>{totalCGST.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between border-b p-1" style={{ borderColor: '#d1d5db' }}>
                            <span>Add SGST (₹)</span>
                            <span>{totalSGST.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between border-b border-[#000000] p-1">
                            <span>Round Off (₹)</span>
                            <span>{roundOff.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between p-1 font-bold text-sm" style={{ backgroundColor: '#f3f4f6' }}>
                            <span>Grand Total (₹)</span>
                            <span>{finalGrandTotal.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Notes & Signature */}
                <div className="flex border border-[#000000] text-[10px]" style={{ minHeight: '80px' }}>
                    <div className="w-[60%] border-r border-[#000000] p-2">
                        <div className="font-bold mb-1">Notes :</div>
                        <div className="uppercase">{data.site?.name}</div>
                        {data.creator?.role === "purchase_officer" && <div className="mt-2" style={{ color: '#6b7280', fontSize: '8px' }}>Created by: {data.creator.fullName}</div>}
                    </div>
                    <div className="w-[40%] flex flex-col p-2 text-center" style={{ position: 'relative' }}>
                        <div className="font-bold text-[9px]">For, NOTION ELECTRONICS PVT LTD</div>
                        <div className="flex-1 flex flex-col items-center justify-center" style={{ minHeight: '40px', maxHeight: '50px', overflow: 'hidden' }}>
                            {/* Signature Image or Text - Only shown for approved POs */}
                            {data.approver?.signatureUrl ? (
                                <img
                                    src={data.approver.signatureUrl}
                                    alt="Signature"
                                    style={{ maxHeight: '40px', maxWidth: '120px', objectFit: 'contain' }}
                                />
                            ) : data.approver ? (
                                <div className="font-script text-lg">{data.approver.fullName}</div>
                            ) : null}
                            {data.approver && (
                                <div className="text-[8px]" style={{ color: '#4b5563' }}>{data.approver.fullName}</div>
                            )}
                        </div>
                        <div className="font-bold border-t border-[#000000] pt-1">Authorised Signatory</div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-1 text-[8px] font-bold" style={{ color: '#6b7280' }}>
                    This is a computer-generated purchase order. E. & O. E.
                </div>

                {/* Tax Breakdown Table (Bottom Left - Extra) */}
                <div className="mt-4 w-[60%]">
                    <table className="w-full border-collapse border border-[#000000] text-[8px]">
                        <thead>
                            <tr style={{ backgroundColor: '#f3f4f6' }}>
                                <th className="border border-[#000000] p-1">HSN/SAC Code</th>
                                <th className="border border-[#000000] p-1">Taxable (₹)</th>
                                <th className="border border-[#000000] p-1">CGST %</th>
                                <th className="border border-[#000000] p-1">CGST (₹)</th>
                                <th className="border border-[#000000] p-1">SGST %</th>
                                <th className="border border-[#000000] p-1">SGST (₹)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(taxGroups).map(([key, val]) => {
                                const [hsn, _] = key.split('-');
                                return (
                                    <tr key={key}>
                                        <td className="border border-[#000000] p-1 text-center">{hsn}</td>
                                        <td className="border border-[#000000] p-1 text-right">{val.taxable.toFixed(2)}</td>
                                        <td className="border border-[#000000] p-1 text-center">{val.cgstRate}%</td>
                                        <td className="border border-[#000000] p-1 text-right">{val.cgst.toFixed(2)}</td>
                                        <td className="border border-[#000000] p-1 text-center">{val.sgstRate}%</td>
                                        <td className="border border-[#000000] p-1 text-right">{val.sgst.toFixed(2)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

            </div>
        </div>
    );
}
