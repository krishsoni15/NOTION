import { Resend } from 'resend';
import { NextRequest, NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as Blob;
        const poNumber = formData.get('poNumber') as string;
        const vendorName = formData.get('vendorName') as string;
        const vendorEmail = formData.get('vendorEmail') as string;
        const date = formData.get('date') as string;
        const senderName = formData.get('senderName') as string;
        const senderRole = formData.get('senderRole') as string;
        const senderPhone = formData.get('senderPhone') as string;

        if (!vendorEmail || !file) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Convert Blob to Buffer
        const buffer = Buffer.from(await file.arrayBuffer());

        const subject = `New Purchase Order Issued: ${poNumber} – Notion Electronica Pvt. Ltd.`;

        const htmlContent = `
            <p>Dear ${vendorName || 'Vendor'},</p>
            
            <p>I hope this email finds you well.</p>
            
            <p>Please find attached the latest Purchase Order (<strong>${poNumber}</strong>) issued by Notion Electronica Pvt. Ltd., dated ${date}.</p>
            
            <p>We kindly request you to review the specifications, quantities, and delivery timelines outlined in the document. To ensure a smooth procurement process, please provide the following:</p>
            
            <ul>
                <li><strong>Acknowledgment:</strong> A formal confirmation of receipt of this PO.</li>
                <li><strong>Delivery Date:</strong> Confirmation of the expected delivery schedule.</li>
                <li><strong>Invoice:</strong> Please ensure all future invoices reference this specific PO number to avoid payment delays.</li>
            </ul>
            
            <p>If there are any discrepancies or if you require further clarification regarding the terms, please reach out to us at your earliest convenience.</p>
            
            <p>Thank you for your continued partnership.</p>
            
            <p>Best regards,</p>
            
            <p>
                <strong>${senderName}</strong><br>
                ${senderRole}<br>
                Notion Electronica Pvt. Ltd.<br>
                ${senderPhone ? `${senderPhone}<br>` : ''}
            </p>
        `;

        const data = await resend.emails.send({
            from: 'Notion Purchase Orders <onboarding@resend.dev>', // Use verified domain or Resend test domain
            to: ['krish1506soni@gmail.com'], // Restricted to verified email in Resend free tier
            subject: subject,
            html: `
                <div style="background-color: #f3f4f6; padding: 10px; margin-bottom: 20px; border-radius: 5px; border: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #6b7280; font-size: 12px;"><strong>Debugging Note:</strong> This email was intended for <strong>${vendorEmail}</strong>. In production mode with a verified domain, it will be sent there.</p>
                </div>
                ${htmlContent}
            `,
            attachments: [
                {
                    filename: `PO-${poNumber}.pdf`,
                    content: buffer,
                },
            ],
        });

        if (data.error) {
            console.error('Resend Error:', data.error);
            return NextResponse.json({ error: data.error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Error sending email:', error);
        return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }
}
