"use client";

import { format } from "date-fns";

export interface DCData {
    deliveryId: string;
    createdAt: number;
    deliveryType: "private" | "public" | "vendor";
    deliveryPerson?: string;
    deliveryContact?: string;
    vehicleNumber?: string;
    receiverName: string;
    po?: {
        poNumber: string;
    } | null;
    vendor?: {
        companyName: string;
        contactName?: string;
        address?: string;
        gstNumber?: string;
        phone?: string;
        email?: string;
    } | null;
    items: Array<{
        _id: string;
        itemName: string;
        quantity: number;
        unit: string;
        description?: string;
        hsnSacCode?: string;
        unitRate?: number;
        rate?: number;
        discountPercent?: number;
        gstTaxRate?: number;
    }>;
    creator?: {
        fullName: string;
    } | null;
    notes?: string;
    buyersOrderNo?: string;
}

// Helper: Extract state name from GST state code
const GST_STATE_CODES: Record<string, string> = {
    "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh",
    "05": "Uttarakhand", "06": "Haryana", "07": "Delhi", "08": "Rajasthan",
    "09": "Uttar Pradesh", "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh",
    "13": "Nagaland", "14": "Manipur", "15": "Mizoram", "16": "Tripura",
    "17": "Meghalaya", "18": "Assam", "19": "West Bengal", "20": "Jharkhand",
    "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
    "27": "Maharashtra", "29": "Karnataka", "32": "Kerala", "33": "Tamil Nadu",
    "36": "Telangana",
};
function getStateFromGST(gst?: string): { stateName: string; stateCode: string } {
    if (!gst || gst.length < 2) return { stateName: "Gujarat", stateCode: "24" };
    const code = gst.substring(0, 2);
    return { stateName: GST_STATE_CODES[code] || "Unknown", stateCode: code };
}

export function DeliveryChallanTemplate({ data }: { data: DCData }) {
    const dcDate = format(new Date(data.createdAt), "dd-MMM-yy");

    // Tally often uses a very rigid table structure with specific headers
    // Let's implement the layout from the screenshot

    return (
        <>
            <style>{`
                @media print {
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        color-adjust: exact !important;
                    }
                    body {
                        margin: 0;
                        padding: 0;
                        background: white;
                    }
                    .delivery-challan-print {
                        width: 210mm;
                        height: 297mm;
                        margin: 0;
                        padding: 0;
                        page-break-after: always;
                    }
                }
                .dc-global-padding th,
                .dc-global-padding td {
                    padding: 6px 10px !important;
                    vertical-align: middle !important;
                }
                .dc-global-padding .p-1\\.5 {
                    padding: 8px 10px !important;
                }
                .dc-global-padding .px-1\\.5 {
                    padding-left: 8px !important;
                    padding-right: 8px !important;
                }
            `}</style>
            <div className="bg-white text-black font-sans text-[10px] leading-tight delivery-challan-print dc-global-padding" style={{ width: '210mm', minHeight: '297mm', padding: '14mm', margin: '0 auto', boxSizing: 'border-box' }} data-print-content>
                <div className="w-full flex flex-col border border-black" style={{ minHeight: 'calc(297mm - 28mm)', boxSizing: 'border-box' }}>
                {/* Header Title */}
                <div className="text-center py-1 border-b border-black font-bold text-sm">
                Delivery Challan
            </div>

            {/* Top Section: Company & DC Info */}
            <div className="flex border-b border-black">
                {/* Company Info (Left) */}
                <div className="w-[55%] border-r border-black p-1.5">
                    <div className="font-bold text-xs">NOTION ELECTRONICS PRIVATE LIMITED 2024-25</div>
                    <div>710 NARODA BUSINESS HUB, NR. D-MART NARODA</div>
                    <div>DAHEGAM ROAD, HANSPURA , NARODA</div>
                    <div>AHMEDABAD-382330</div>
                    <div>GSTIN/UIN: 24AAFCN9846H1Z4</div>
                    <div>State Name : Gujarat, Code : 24</div>
                    <div>CIN: U74999GJ2018PTC101344</div>
                    <div>E-Mail : accounts@notionelectronics.com</div>
                </div>

                {/* DC Info (Right) */}
                <div className="w-[45%] flex flex-col">
                    <div className="flex border-b border-black flex-1">
                        <div className="w-1/2 border-r border-black p-1.5 flex flex-col">
                            <span className="text-[8px] text-gray-600">Delivery Note No.</span>
                            <span className="font-bold">{data.deliveryId}</span>
                        </div>
                        <div className="w-1/2 p-1.5 flex flex-col">
                            <span className="text-[8px] text-gray-600">Dated</span>
                            <span className="font-bold">{dcDate}</span>
                        </div>
                    </div>
                    <div className="flex border-b border-black flex-1">
                        <div className="w-1/2 border-r border-black p-1.5 flex flex-col">
                            <span className="text-[8px] text-gray-600">Reference No. & Date.</span>
                            <span className="font-bold">{dcDate} /{data.po?.poNumber || data.deliveryId}</span>
                        </div>
                        <div className="w-1/2 p-1.5 flex flex-col">
                            <span className="text-[8px] text-gray-600">Mode/Terms of Payment</span>
                            <span className="font-bold">-</span>
                        </div>
                    </div>
                    <div className="flex border-b border-black flex-1">
                        <div className="w-1/2 border-r border-black p-1.5 flex flex-col">
                            <span className="text-[8px] text-gray-600">Buyer's Order No.</span>
                            <span className="font-bold">{data.buyersOrderNo || data.po?.poNumber || '-'}</span>
                        </div>
                        <div className="w-1/2 p-1.5 flex flex-col">
                            <span className="text-[8px] text-gray-600">Dated</span>
                            <span className="font-bold">{dcDate}</span>
                        </div>
                    </div>
                    <div className="flex border-b border-black flex-1">
                        <div className="w-1/2 border-r border-black p-1.5 flex flex-col">
                            <span className="text-[8px] text-gray-600">Dispatch Doc No.</span>
                            <span className="font-bold">{data.deliveryId}</span>
                        </div>
                        <div className="w-1/2 p-1.5 flex flex-col">
                            <span className="text-[8px] text-gray-600">Destination</span>
                            <span className="font-bold uppercase">{data.receiverName || '-'}</span>
                        </div>
                    </div>
                    <div className="flex border-b border-black flex-1">
                        <div className="w-1/2 border-r border-black p-1.5 flex flex-col">
                            <span className="text-[8px] text-gray-600">Dispatched through</span>
                            <span className="font-bold uppercase">{data.deliveryType === 'public' ? 'PORTER' : data.deliveryType === 'private' ? 'PRIVATE' : 'TRANSPORT'}</span>
                        </div>
                        <div className="w-1/2 p-1.5 flex flex-col">
                            <span className="text-[8px] text-gray-600">Motor Vehicle No.</span>
                            <span className="font-bold">{data.vehicleNumber || '-'}</span>
                        </div>
                    </div>
                    <div className="flex flex-1">
                        <div className="w-1/2 border-r border-black p-1.5 flex flex-col">
                            <span className="text-[8px] text-gray-600">Bill of Lading/LR-RR No.</span>
                            <span className="font-bold">-</span>
                        </div>
                        <div className="w-1/2 p-1.5 flex flex-col">
                            <span className="text-[8px] text-gray-600">Terms of Delivery</span>
                            <span className="font-bold uppercase">{data.deliveryType === 'public' ? 'BY PORTER' : data.deliveryType === 'private' ? 'BY PRIVATE VEHICLE' : 'BY TRANSPORT'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Consignee & Buyer Section - Stacked Vertically */}
            <div className="flex flex-col">
                {/* Consignee (Ship to) */}
                <div className="border-b border-black p-1.5 min-h-[60px]">
                    <span className="text-[8px] text-gray-600 italic">Consignee (Ship to)</span>
                    <div className="font-bold uppercase mt-1">{data.vendor?.companyName || data.receiverName || 'Consignee Name'}</div>
                    <div className="whitespace-pre-line">
                        {data.vendor?.address || 'Address'}{"\n"}
                        GSTIN/UIN  : {data.vendor?.gstNumber || '-'}{"\n"}
                        State Name  : {(() => { const s = getStateFromGST(data.vendor?.gstNumber); return `${s.stateName}, Code : ${s.stateCode}`; })()}
                    </div>
                </div>

                {/* Buyer (Bill to) */}
                <div className="border-b border-black p-1.5 min-h-[60px]">
                    <span className="text-[8px] text-gray-600 italic">Buyer (Bill to)</span>
                    <div className="font-bold uppercase mt-1">{data.vendor?.companyName || 'Buyer Name'}</div>
                    <div className="whitespace-pre-line">
                        {data.vendor?.address || 'Buyer Address'}{"\n"}
                        GSTIN/UIN  : {data.vendor?.gstNumber || '-'}{"\n"}
                        State Name  : {(() => { const s = getStateFromGST(data.vendor?.gstNumber); return `${s.stateName}, Code : ${s.stateCode}`; })()}
                    </div>
                </div>
            </div>

            {/* Items Table */}
            <div className="flex-1">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="border-b border-black text-center font-bold h-7">
                            <th className="border-r border-black w-10">Sl No.</th>
                            <th className="border-r border-black px-1.5 text-left">Description of Goods</th>
                            <th className="border-r border-black w-20">HSN/SAC</th>
                            <th className="border-r border-black w-24">Quantity</th>
                            <th className="border-r border-black w-20">Rate</th>
                            <th className="border-r border-black w-12">per</th>
                            <th className="border-r border-black w-16">Disc. %</th>
                            <th className="w-24">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.items && data.items.length > 0 ? (
                            data.items.map((item, index) => (
                                <tr key={item._id || index} className="h-10">
                                    <td className="border-r border-black text-center pt-1">{index + 1}</td>
                                    <td className="border-r border-black px-1.5 pt-1">
                                        <div className="font-bold uppercase">{item.itemName || ''}</div>
                                        {item.description && (
                                            <div className="text-[8px] italic mt-0.5 whitespace-pre-wrap" style={{ color: '#4b5563' }}>{item.description}</div>
                                        )}
                                    </td>
                                    <td className="border-r border-black text-center pt-1 font-mono">{item.hsnSacCode || '-'}</td>
                                    <td className="border-r border-black text-center pt-1">
                                        <span className="font-bold">{(item.quantity || 0).toFixed(2)} {item.unit || ''}</span>
                                    </td>
                                    <td className="border-r border-black text-center pt-1">{item.unitRate ? item.unitRate.toFixed(2) : (item.rate ? item.rate.toFixed(2) : '')}</td>
                                    <td className="border-r border-black text-center pt-1">{item.unitRate || item.rate ? item.unit : ''}</td>
                                    <td className="border-r border-black text-center pt-1">{item.discountPercent ? `${item.discountPercent}%` : ''}</td>
                                    <td className="text-right px-1.5 pt-1 font-bold">
                                        {item.unitRate ? (item.quantity * item.unitRate).toFixed(2) : (item.rate ? (item.quantity * item.rate).toFixed(2) : '')}
                                    </td>
                                </tr>
                            ))
                        ) : null}
                        {/* Empty rows to fill space */}
                        {Array.from({ length: Math.max(0, 10 - (data.items?.length || 0)) }).map((_, i) => (
                            <tr key={`empty-${i}`} className="h-10">
                                <td className="border-r border-black"></td>
                                <td className="border-r border-black"></td>
                                <td className="border-r border-black"></td>
                                <td className="border-r border-black"></td>
                                <td className="border-r border-black"></td>
                                <td className="border-r border-black"></td>
                                <td className="border-r border-black"></td>
                                <td className=""></td>
                            </tr>
                        ))}
                        {/* Total Row */}
                        <tr className="border-t border-black font-bold h-7">
                            <td className="border-r border-black"></td>
                            <td className="border-r border-black text-right px-1.5">Total</td>
                            <td className="border-r border-black"></td>
                            <td className="border-r border-black text-center">
                                {data.items ? data.items.reduce((sum, item) => sum + (item.quantity || 0), 0).toFixed(2) : '0.00'} {data.items?.[0]?.unit || ''}
                            </td>
                            <td className="border-r border-black"></td>
                            <td className="border-r border-black"></td>
                            <td className="border-r border-black"></td>
                            <td className="text-right px-1.5">
                                {data.items && data.items.some(i => i.unitRate || i.rate)
                                    ? data.items.reduce((sum, item) => sum + ((item.quantity || 0) * ((item.unitRate || item.rate) || 0)), 0).toFixed(2)
                                    : ''}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Bottom Section */}
            <div>
                {/* HSN/SAC Summary */}
                <div className="flex border-t border-black text-[8px]">
                    <div className="flex-1 border-r border-black">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-black font-bold text-center h-5">
                                    <td className="border-r border-black">HSN/SAC</td>
                                    <td className="w-24 border-r border-black">Taxable{"\n"}Value</td>
                                    <td className="w-48">Total{"\n"}Tax Amount</td>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="text-center h-5">
                                    <td className="border-r border-black font-mono">{data.items[0]?.hsnSacCode || '-'}</td>
                                    <td className="border-r border-black"></td>
                                    <td></td>
                                </tr>
                                <tr className="border-t border-black font-bold text-center h-5">
                                    <td className="border-r border-black text-right px-1.5">Total</td>
                                    <td className="border-r border-black"></td>
                                    <td></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div className="w-32 flex flex-col items-center justify-center font-bold">
                        <span>Taxable</span>
                        <span>Value</span>
                    </div>
                </div>

                {/* Tax in words & Footer */}
                <div className="p-1.5 border-t border-black">
                    <div className="flex justify-between items-start">
                        <div>
                            <div>Tax Amount (in words) : <span className="font-bold">NIL</span></div>
                            <div className="mt-1">Company's PAN : <span className="font-bold">AAFCN9846H</span></div>
                        </div>
                    </div>
                </div>

                {/* Notes Section */}
                {data.notes && (
                    <div className="p-1.5 border-t border-black">
                        <span className="text-[8px] text-gray-600 font-semibold">Notes:</span>
                        <div className="mt-0.5 whitespace-pre-wrap">{data.notes}</div>
                    </div>
                )}

                {/* Signature Section */}
                <div className="flex border-t border-black h-20">
                    <div className="w-[55%] border-r border-black p-1.5 flex flex-col justify-between">
                        <span className="text-[8px] italic">Recd. in Good Condition</span>
                        <div className="w-full h-10"></div>
                    </div>
                    <div className="w-[45%] p-1.5 flex flex-col justify-between items-end">
                        <span className="font-bold">for NOTION ELECTRONICS PRIVATE LIMITED 2024-25</span>
                        <span className="font-bold mt-auto">Authorised Signatory</span>
                    </div>
                </div>
            </div>

            {/* Bottom Text */}
            <div className="text-center p-1 text-[8px] font-bold">
                <div>SUBJECT TO AHMEDABAD JURISDICTION</div>
                <div className="mt-1">This is a Computer Generated Document</div>
            </div>
            </div>
            </div>
        </>
    );
}
