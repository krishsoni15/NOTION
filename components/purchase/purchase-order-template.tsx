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
        <div className="bg-white text-black font-sans text-xs w-full">
            {/* PO Content */}
            <div className="max-w-[210mm] mx-auto bg-white">

                {/* Header */}
                <div className="text-center mb-6">
                    <div className="flex justify-center items-center mb-2">
                        {/* Logo Placeholder */}
                        <div className="text-3xl font-bold text-blue-900 tracking-wide">NOTION <sup className="text-sm">®</sup></div>
                    </div>
                    <div className="text-sm text-gray-600 mb-1">"Enlighten the World"</div>

                    {/* Icons placeholder row */}
                    <div className="flex justify-center gap-4 my-2 text-[10px] text-gray-500">
                        <div className="flex flex-col items-center"><span>🏭</span><span>Manufacturing</span></div>
                        <div className="flex flex-col items-center"><span>🛡️</span><span>Quality</span></div>
                        <div className="flex flex-col items-center"><span>💡</span><span>Product Design</span></div>
                        <div className="flex flex-col items-center"><span>🤝</span><span>Service</span></div>
                        <div className="flex flex-col items-center"><span>🚚</span><span>Delivery</span></div>
                    </div>

                    <h1 className="text-xl font-bold uppercase underline decoration-2 underline-offset-4 mb-1">NOTION ELECTRONICS PVT. LTD.</h1>
                    <h2 className="text-sm font-semibold underline mb-1">Manufacturer of LED Lights</h2>
                    <div className="text-[10px] leading-tight text-gray-700">
                        <p>📍 C-112, Maruti Industrial Estate, Part-C, Opp. Fire Station, Naroda Road, Memco, Ahmedabad 380025, Gujarat, India</p>
                        <div className="flex justify-center gap-4 mt-1">
                            <span>🌐 www.notionelectronics.com</span>
                            <span>✉️ sales@notionelectronics.com</span>
                            <span>📞 +91 9825879970</span>
                        </div>
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
                <table className="w-full border-collapse border border-black text-[10px] mb-2">
                    <thead>
                        <tr className="bg-gray-50">
                            <th className="border border-black p-1 text-center w-[30px]">No.</th>
                            <th className="border border-black p-1 text-left">Item & Description</th>
                            <th className="border border-black p-1 text-center w-[60px]">HSN / SAC</th>
                            <th className="border border-black p-1 text-center w-[40px]">Qty</th>
                            <th className="border border-black p-1 text-center w-[40px]">Unit</th>
                            <th className="border border-black p-1 text-right w-[60px]">Rate (₹)</th>
                            <th className="border border-black p-1 text-right w-[50px]">Discount</th>
                            <th className="border border-black p-1 text-right w-[70px]">Taxable (₹)</th>
                            <th className="border border-black p-1 text-right w-[40px]">CGST</th>
                            <th className="border border-black p-1 text-right w-[40px]">SGST</th>
                            <th className="border border-black p-1 text-right w-[80px]">Amount (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {processedItems.map((item, idx) => (
                            <tr key={item._id}>
                                <td className="border border-black p-1 text-center font-bold">{idx + 1}</td>
                                <td className="border border-black p-1">
                                    <div className="font-bold uppercase">{item.itemDescription.split('\n')[0]}</div>
                                    <div className="text-[9px] text-gray-600 whitespace-pre-line">{item.itemDescription}</div>
                                </td>
                                <td className="border border-black p-1 text-center">{item.hsnSacCode || '-'}</td>
                                <td className="border border-black p-1 text-center font-bold">{item.quantity}</td>
                                <td className="border border-black p-1 text-center">{item.unit}</td>
                                <td className="border border-black p-1 text-right">{item.unitRate.toFixed(2)}</td>
                                <td className="border border-black p-1 text-right">{item.discountPercent > 0 ? `${item.discountPercent}%` : '0.00%'}</td>
                                <td className="border border-black p-1 text-right font-bold">{item.taxableValue.toFixed(2)}</td>
                                <td className="border border-black p-1 text-right">{item.cgstRate}%</td>
                                <td className="border border-black p-1 text-right">{item.sgstRate}%</td>
                                <td className="border border-black p-1 text-right font-bold">{item.itemTotal.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Totals Section */}
                <div className="flex border border-black text-[10px] mb-2">
                    <div className="w-[60%] border-r border-black p-2 flex flex-col justify-between">
                        <div>
                            <div className="font-bold underline mb-1">Total Purchase Order Amount in Words :</div>
                            <div className="font-bold italic uppercase">{numberToWords(finalGrandTotal)}</div>
                        </div>
                    </div>
                    <div className="w-[40%]">
                        <div className="flex justify-between border-b border-gray-300 p-1">
                            <span>Total Amount before Tax (₹)</span>
                            <span className="font-bold">{totalTaxable.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-300 p-1">
                            <span>Add CGST (₹)</span>
                            <span>{totalCGST.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-300 p-1">
                            <span>Add SGST (₹)</span>
                            <span>{totalSGST.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between border-b border-black p-1">
                            <span>Round Off (₹)</span>
                            <span>{roundOff.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between p-1 bg-gray-100 font-bold text-sm">
                            <span>Grand Total (₹)</span>
                            <span>{finalGrandTotal.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Notes & Signature */}
                <div className="flex border border-black text-[10px] min-h-[80px]">
                    <div className="w-[60%] border-r border-black p-2">
                        <div className="font-bold mb-1">Notes :</div>
                        <div className="uppercase">{data.site?.name}</div>
                        {data.creator?.role === "purchase_officer" && <div className="mt-2 text-gray-500 text-[8px]">Created by: {data.creator.fullName}</div>}
                    </div>
                    <div className="w-[40%] flex flex-col justify-between p-2 text-center">
                        <div className="font-bold text-[9px]">For, NOTION ELECTRONICS PVT LTD</div>
                        <div className="h-10">
                            {/* Signature Space */}
                            {data.approver && <div className="font-script text-lg">{data.approver.fullName}</div>}
                        </div>
                        <div className="font-bold border-t border-black pt-1">Authorised Signatory</div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-1 text-[8px] text-gray-500 font-bold">
                    This is a computer-generated purchase order. E. & O. E.
                </div>

                {/* Tax Breakdown Table (Bottom Left - Extra) */}
                <div className="mt-4 w-[60%]">
                    <table className="w-full border-collapse border border-black text-[8px]">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border border-black p-1">HSN/SAC Code</th>
                                <th className="border border-black p-1">Taxable (₹)</th>
                                <th className="border border-black p-1">CGST %</th>
                                <th className="border border-black p-1">CGST (₹)</th>
                                <th className="border border-black p-1">SGST %</th>
                                <th className="border border-black p-1">SGST (₹)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(taxGroups).map(([key, val]) => {
                                const [hsn, _] = key.split('-');
                                return (
                                    <tr key={key}>
                                        <td className="border border-black p-1 text-center">{hsn}</td>
                                        <td className="border border-black p-1 text-right">{val.taxable.toFixed(2)}</td>
                                        <td className="border border-black p-1 text-center">{val.cgstRate}%</td>
                                        <td className="border border-black p-1 text-right">{val.cgst.toFixed(2)}</td>
                                        <td className="border border-black p-1 text-center">{val.sgstRate}%</td>
                                        <td className="border border-black p-1 text-right">{val.sgst.toFixed(2)}</td>
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
