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
        discountPercent?: number;
        gstTaxRate?: number;
    }>;
    creator?: {
        fullName: string;
    } | null;
}

// All styles are inline hex values — NO Tailwind color classes — so html2canvas
// (used for PDF generation) never encounters modern CSS color functions like oklch/lab.
const S = {
    root: { width: '210mm', minHeight: '297mm', padding: 0, margin: 0, boxSizing: 'border-box' as const, border: '1px solid #000', fontFamily: 'sans-serif', fontSize: 10, lineHeight: 1.3, color: '#000', backgroundColor: '#fff' },
    titleBar: { textAlign: 'center' as const, padding: '4px 0', borderBottom: '1px solid #000', fontWeight: 'bold', fontSize: 14 },
    topSection: { display: 'flex', borderBottom: '1px solid #000' },
    companyCol: { width: '55%', borderRight: '1px solid #000', padding: '6px' },
    companyName: { fontWeight: 'bold', fontSize: 12 },
    dcInfoCol: { width: '45%', display: 'flex', flexDirection: 'column' as const },
    infoRow: { display: 'flex', borderBottom: '1px solid #000', flex: 1 },
    infoRowLast: { display: 'flex', flex: 1 },
    infoCell: { width: '50%', borderRight: '1px solid #000', padding: '6px', display: 'flex', flexDirection: 'column' as const },
    infoCellLast: { width: '50%', padding: '6px', display: 'flex', flexDirection: 'column' as const },
    labelText: { fontSize: 8, color: '#4b5563' },
    valueText: { fontWeight: 'bold' },
    consigneeSection: { display: 'flex', borderBottom: '1px solid #000', minHeight: 120 },
    consigneeCol: { width: '55%', borderRight: '1px solid #000', padding: '6px' },
    buyerCol: { width: '45%', padding: '6px' },
    sectionLabel: { fontSize: 8, color: '#4b5563', fontStyle: 'italic' },
    boldUpper: { fontWeight: 'bold', textTransform: 'uppercase' as const, marginTop: 4 },
    preWrap: { whiteSpace: 'pre-line' as const },
    table: { width: '100%', borderCollapse: 'collapse' as const },
    thRow: { borderBottom: '1px solid #000', textAlign: 'center' as const, fontWeight: 'bold', height: 28 },
    th: { borderRight: '1px solid #000', padding: '2px 4px' },
    thLast: { padding: '2px 4px' },
    tdRow: { height: 40, verticalAlign: 'top' as const },
    td: { borderRight: '1px solid #000', textAlign: 'center' as const, paddingTop: 4 },
    tdLeft: { borderRight: '1px solid #000', padding: '4px 6px', textAlign: 'left' as const },
    tdRight: { textAlign: 'right' as const, padding: '4px 6px', fontWeight: 'bold' },
    tdLast: { textAlign: 'center' as const, paddingTop: 4 },
    emptyTd: { borderRight: '1px solid #000' },
    emptyTdLast: {},
    descGray: { fontSize: 8, fontStyle: 'italic', marginTop: 2, whiteSpace: 'pre-wrap' as const, color: '#4b5563' },
    totalRow: { borderTop: '1px solid #000', fontWeight: 'bold', height: 28 },
    bottomSection: {},
    hsnRow: { display: 'flex', borderTop: '1px solid #000', fontSize: 8 },
    hsnLeft: { flex: 1, borderRight: '1px solid #000' },
    hsnRight: { width: 128, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' },
    hsnThRow: { borderBottom: '1px solid #000', fontWeight: 'bold', textAlign: 'center' as const, height: 20 },
    hsnTd: { borderRight: '1px solid #000' },
    hsnTdLast: {},
    hsnDataRow: { textAlign: 'center' as const, height: 20 },
    hsnTotalRow: { borderTop: '1px solid #000', fontWeight: 'bold', textAlign: 'center' as const, height: 20 },
    footer1: { padding: '6px', borderTop: '1px solid #000' },
    sigSection: { display: 'flex', borderTop: '1px solid #000', height: 80 },
    sigLeft: { width: '55%', borderRight: '1px solid #000', padding: '6px', display: 'flex', flexDirection: 'column' as const, justifyContent: 'space-between' },
    sigRight: { width: '45%', padding: '6px', display: 'flex', flexDirection: 'column' as const, justifyContent: 'space-between', alignItems: 'flex-end' },
    bottomText: { textAlign: 'center' as const, padding: '4px', fontSize: 8, fontWeight: 'bold' },
};

export function DeliveryChallanTemplate({ data }: { data: DCData }) {
    const dcDate = format(new Date(data.createdAt), "dd-MMM-yy");
    const poDate = data.po ? format(new Date(data.createdAt), "dd-MMM-yy") : "-";

    return (
        <div style={S.root}>
            {/* Header Title */}
            <div style={S.titleBar}>Delivery Challan</div>

            {/* Top Section: Company & DC Info */}
            <div style={S.topSection}>
                {/* Company Info (Left) */}
                <div style={S.companyCol}>
                    <div style={S.companyName}>NOTION ELECTRONICS PRIVATE LIMITED 2024-25</div>
                    <div>710 NARODA BUSINESS HUB, NR. D-MART NARODA</div>
                    <div>DAHEGAM ROAD, HANSPURA , NARODA</div>
                    <div>AHMEDABAD-382330</div>
                    <div>GSTIN/UIN: 24AAFCN9846H1Z4</div>
                    <div>State Name : Gujarat, Code : 24</div>
                    <div>CIN: U74999GJ2018PTC101344</div>
                    <div>E-Mail : accounts@notionelectronics.com</div>
                </div>

                {/* DC Info (Right) */}
                <div style={S.dcInfoCol}>
                    <div style={S.infoRow}>
                        <div style={S.infoCell}>
                            <span style={S.labelText}>Delivery Note No.</span>
                            <span style={S.valueText}>{data.deliveryId}</span>
                        </div>
                        <div style={S.infoCellLast}>
                            <span style={S.labelText}>Dated</span>
                            <span style={S.valueText}>{dcDate}</span>
                        </div>
                    </div>
                    <div style={S.infoRow}>
                        <div style={S.infoCell}>
                            <span style={S.labelText}>Reference No. & Date.</span>
                            <span style={S.valueText}>{data.po?.poNumber || data.deliveryId}</span>
                        </div>
                        <div style={S.infoCellLast}>
                            <span style={S.labelText}>Mode/Terms of Payment</span>
                            <span style={S.valueText}>-</span>
                        </div>
                    </div>
                    <div style={S.infoRow}>
                        <div style={S.infoCell}>
                            <span style={S.labelText}>Buyer&apos;s Order No.</span>
                            <span style={S.valueText}>{data.po?.poNumber || '-'}</span>
                        </div>
                        <div style={S.infoCellLast}>
                            <span style={S.labelText}>Dated</span>
                            <span style={S.valueText}>{poDate}</span>
                        </div>
                    </div>
                    <div style={S.infoRow}>
                        <div style={S.infoCell}>
                            <span style={S.labelText}>Dispatch Doc No.</span>
                            <span style={S.valueText}>{data.deliveryId}</span>
                        </div>
                        <div style={S.infoCellLast}>
                            <span style={S.labelText}>Destination</span>
                            <span style={{ ...S.valueText, textTransform: 'uppercase' }}>{data.receiverName || '-'}</span>
                        </div>
                    </div>
                    <div style={S.infoRow}>
                        <div style={S.infoCell}>
                            <span style={S.labelText}>Dispatched through</span>
                            <span style={{ ...S.valueText, textTransform: 'uppercase' }}>
                                {data.deliveryType === 'public' ? 'PORTER' : data.deliveryType === 'private' ? 'PRIVATE' : 'TRANSPORT'}
                            </span>
                        </div>
                        <div style={S.infoCellLast}>
                            <span style={S.labelText}>Motor Vehicle No.</span>
                            <span style={S.valueText}>{data.vehicleNumber || '-'}</span>
                        </div>
                    </div>
                    <div style={S.infoRowLast}>
                        <div style={S.infoCell}>
                            <span style={S.labelText}>Bill of Lading/LR-RR No.</span>
                            <span style={S.valueText}>-</span>
                        </div>
                        <div style={S.infoCellLast}>
                            <span style={S.labelText}>Terms of Delivery</span>
                            <span style={{ ...S.valueText, textTransform: 'uppercase' }}>BY ROAD</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Consignee & Buyer Section */}
            <div style={S.consigneeSection}>
                {/* Consignee (Ship to) */}
                <div style={S.consigneeCol}>
                    <span style={S.sectionLabel}>Consignee (Ship to)</span>
                    <div style={S.boldUpper}>{data.receiverName || 'Site Contact'}</div>
                    <div style={S.preWrap}>
                        {data.vendor?.address || 'Site Address'}{"\n"}
                        GSTIN/UIN  : {data.vendor?.gstNumber || '-'}{"\n"}
                        State Name  : Gujarat, Code : 24
                    </div>
                </div>

                {/* Buyer (Bill to) */}
                <div style={S.buyerCol}>
                    <span style={S.sectionLabel}>Buyer (Bill to)</span>
                    <div style={S.boldUpper}>{data.vendor?.companyName || 'Buyer Name'}</div>
                    <div style={S.preWrap}>
                        {data.vendor?.address || 'Buyer Address'}{"\n"}
                        GSTIN/UIN  : {data.vendor?.gstNumber || '-'}{"\n"}
                        State Name  : Gujarat, Code : 24
                    </div>
                </div>
            </div>

            {/* Items Table */}
            <div>
                <table style={S.table}>
                    <thead>
                        <tr style={S.thRow}>
                            <th style={{ ...S.th, width: 40 }}>Sl No.</th>
                            <th style={{ ...S.th, textAlign: 'left' }}>Description of Goods</th>
                            <th style={{ ...S.th, width: 80 }}>HSN/SAC</th>
                            <th style={{ ...S.th, width: 96 }}>Quantity</th>
                            <th style={{ ...S.th, width: 80 }}>Rate</th>
                            <th style={{ ...S.th, width: 48 }}>per</th>
                            <th style={{ ...S.th, width: 64 }}>Disc. %</th>
                            <th style={{ ...S.thLast, width: 96 }}>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.items.map((item, index) => (
                            <tr key={item._id} style={S.tdRow}>
                                <td style={S.td}>{index + 1}</td>
                                <td style={S.tdLeft}>
                                    <div style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{item.itemName}</div>
                                    {item.description && (
                                        <div style={S.descGray}>{item.description}</div>
                                    )}
                                </td>
                                <td style={{ ...S.td, fontFamily: 'monospace' }}>{item.hsnSacCode || '-'}</td>
                                <td style={S.td}>
                                    <span style={{ fontWeight: 'bold' }}>{item.quantity.toFixed(2)} {item.unit}</span>
                                </td>
                                <td style={S.td}>{item.unitRate?.toFixed(2) || ''}</td>
                                <td style={S.td}>{item.unitRate ? item.unit : ''}</td>
                                <td style={S.td}>{item.discountPercent ? `${item.discountPercent}%` : ''}</td>
                                <td style={S.tdRight}>
                                    {item.unitRate ? (item.quantity * item.unitRate).toFixed(2) : ''}
                                </td>
                            </tr>
                        ))}
                        {/* Empty rows to fill space */}
                        {Array.from({ length: Math.max(0, 10 - data.items.length) }).map((_, i) => (
                            <tr key={`empty-${i}`} style={S.tdRow}>
                                <td style={S.emptyTd}></td>
                                <td style={S.emptyTd}></td>
                                <td style={S.emptyTd}></td>
                                <td style={S.emptyTd}></td>
                                <td style={S.emptyTd}></td>
                                <td style={S.emptyTd}></td>
                                <td style={S.emptyTd}></td>
                                <td style={S.emptyTdLast}></td>
                            </tr>
                        ))}
                        {/* Total Row */}
                        <tr style={S.totalRow}>
                            <td style={S.emptyTd}></td>
                            <td style={{ ...S.emptyTd, textAlign: 'right', padding: '0 6px' }}>Total</td>
                            <td style={S.emptyTd}></td>
                            <td style={{ ...S.td }}>
                                {data.items.reduce((sum, item) => sum + item.quantity, 0).toFixed(2)} {data.items[0]?.unit}
                            </td>
                            <td style={S.emptyTd}></td>
                            <td style={S.emptyTd}></td>
                            <td style={S.emptyTd}></td>
                            <td style={{ textAlign: 'right', padding: '0 6px' }}>
                                {data.items.some(i => i.unitRate)
                                    ? data.items.reduce((sum, item) => sum + (item.quantity * (item.unitRate || 0)), 0).toFixed(2)
                                    : ''}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Bottom Section */}
            <div style={S.bottomSection}>
                {/* HSN/SAC Summary */}
                <div style={S.hsnRow}>
                    <div style={S.hsnLeft}>
                        <table style={S.table}>
                            <thead>
                                <tr style={S.hsnThRow}>
                                    <td style={S.hsnTd}>HSN/SAC</td>
                                    <td style={{ ...S.hsnTd, width: 96 }}>Taxable{"\n"}Value</td>
                                    <td style={{ ...S.hsnTdLast, width: 192 }}>Total{"\n"}Tax Amount</td>
                                </tr>
                            </thead>
                            <tbody>
                                <tr style={S.hsnDataRow}>
                                    <td style={{ ...S.hsnTd, fontFamily: 'monospace' }}>{data.items[0]?.hsnSacCode || '-'}</td>
                                    <td style={S.hsnTd}></td>
                                    <td style={S.hsnTdLast}></td>
                                </tr>
                                <tr style={S.hsnTotalRow}>
                                    <td style={{ ...S.hsnTd, textAlign: 'right', padding: '0 6px' }}>Total</td>
                                    <td style={S.hsnTd}></td>
                                    <td style={S.hsnTdLast}></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div style={S.hsnRight}>
                        <span>Taxable</span>
                        <span>Value</span>
                    </div>
                </div>

                {/* Tax in words & Footer */}
                <div style={S.footer1}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <div>Tax Amount (in words) : <span style={{ fontWeight: 'bold' }}>NIL</span></div>
                            <div style={{ marginTop: 4 }}>Company&apos;s PAN : <span style={{ fontWeight: 'bold' }}>AAFCN9846H</span></div>
                        </div>
                    </div>
                </div>

                {/* Signature Section */}
                <div style={S.sigSection}>
                    <div style={S.sigLeft}>
                        <span style={{ fontSize: 8, fontStyle: 'italic' }}>Recd. in Good Condition</span>
                        <div style={{ width: '100%', height: 40 }}></div>
                    </div>
                    <div style={S.sigRight}>
                        <span style={{ fontWeight: 'bold' }}>for NOTION ELECTRONICS PRIVATE LIMITED 2024-25</span>
                        <span style={{ fontWeight: 'bold', marginTop: 'auto' }}>Authorised Signatory</span>
                    </div>
                </div>
            </div>

            {/* Bottom Text */}
            <div style={S.bottomText}>
                <div>SUBJECT TO AHMEDABAD JURISDICTION</div>
                <div style={{ marginTop: 4 }}>This is a Computer Generated Document</div>
            </div>
        </div>
    );
}
