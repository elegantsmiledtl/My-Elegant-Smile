
'use server';

import twilio from 'twilio';
import sgMail from '@sendgrid/mail';
import type { DentalCase } from '@/types';

export const sendNewCaseNotification = async (newCase: Omit<DentalCase, 'id' | 'createdAt'>) => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_WHATSAPP_FROM;
    const toNumbers = process.env.WHATSAPP_RECIPIENT_NUMBER;

    const envCheck = {
        TWILIO_ACCOUNT_SID: accountSid ? 'Loaded' : 'MISSING!',
        TWILIO_AUTH_TOKEN: authToken ? 'Loaded' : 'MISSING!',
        TWILIO_WHATSAPP_FROM: fromNumber || 'MISSING!',
        WHATSAPP_RECIPIENT_NUMBER: toNumbers || 'MISSING!',
    };

    if (!accountSid || !authToken || !fromNumber || !toNumbers) {
        const missingVars = Object.entries(envCheck)
            .filter(([, status]) => status === 'MISSING!')
            .map(([key]) => key)
            .join(', ');

        const errorMsg = `Cannot send notification. Server is missing environment variables: ${missingVars}. Please check your .env file and restart the server.`;
        return { success: false, error: errorMsg, details: [] };
    }

    try {
        const client = twilio(accountSid, authToken);
        const toothCount = newCase.toothNumbers.split(',').filter(t => t.trim()).length;
        
        const caseDetails = `
Patient: ${newCase.patientName}
Dentist: ${newCase.dentistName}
Units: ${toothCount} (${newCase.toothNumbers})
Material: ${newCase.material}
Prosthesis: ${newCase.prosthesisType}
Delivery Date: ${newCase.deliveryDate ? new Date(newCase.deliveryDate).toLocaleDateString() : 'N/A'}`;

        const messageBody = `*New Elegant Smile Case*\n${caseDetails}`;
        const fromNumberFormatted = `whatsapp:${fromNumber.trim()}`;
        const recipientList = toNumbers.split(',').map(num => num.trim()).filter(Boolean);
        
        if(recipientList.length === 0) {
             return { success: false, error: "No recipient numbers found in WHATSAPP_RECIPIENT_NUMBER variable.", details: [] };
        }

        const results = [];
        
        for (const toNumber of recipientList) {
            const toNumberFormatted = `whatsapp:${toNumber}`;
            try {
                const message = await client.messages.create({
                    body: messageBody,
                    from: fromNumberFormatted,
                    to: toNumberFormatted
                });
                results.push({ number: toNumber, success: true, sid: message.sid });
            } catch (error: any) {
                let errorMessage = error.message || "An unknown Twilio error occurred";
                if (error.code === 20003) {
                    errorMessage = "Twilio Authentication Failed. Please check your TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in the .env file. Make sure they are correct and restart your server.";
                }
                results.push({ number: toNumber, success: false, error: `Code ${error.code || 'N/A'}: ${errorMessage}` });
            }
        }

        const allSuccessful = results.every(r => r.success);
        const finalMessage = allSuccessful 
            ? `Successfully sent notifications to all ${results.length} recipient(s).`
            : `Finished sending notifications with one or more errors.`;

        return { 
            success: allSuccessful, 
            message: finalMessage,
            details: results 
        };

    } catch (error: any) {
        return { success: false, error: error.message || "A critical error occurred while setting up the notification.", details: [] };
    }
};


export const sendNewCaseEmail = async (newCase: Omit<DentalCase, 'id' | 'createdAt'>) => {
    const apiKey = process.env.SENDGRID_API_KEY;
    const senderEmail = process.env.SENDER_EMAIL;
    const recipientEmail = process.env.RECIPIENT_EMAIL;

    if (!apiKey || !senderEmail || !recipientEmail) {
        const errorMsg = 'Cannot send email. Server is missing SENDGRID_API_KEY, SENDER_EMAIL, or RECIPIENT_EMAIL from .env file.';
        console.error(errorMsg);
        return { success: false, error: errorMsg };
    }

    sgMail.setApiKey(apiKey);
    const toothCount = newCase.toothNumbers.split(',').filter(t => t.trim()).length;

    const caseDetails = `
        <ul>
            <li><strong>Patient:</strong> ${newCase.patientName}</li>
            <li><strong>Dentist:</strong> ${newCase.dentistName}</li>
            <li><strong>Units:</strong> ${toothCount} (${newCase.toothNumbers})</li>
            <li><strong>Material:</strong> ${newCase.material}</li>
            <li><strong>Prosthesis:</strong> ${newCase.prosthesisType}</li>
            <li><strong>Delivery Date:</strong> ${newCase.deliveryDate ? new Date(newCase.deliveryDate).toLocaleDateString() : 'N/A'}</li>
            <li><strong>Notes:</strong> ${newCase.notes || 'None'}</li>
        </ul>
    `;

    const msg = {
        to: recipientEmail,
        from: senderEmail,
        subject: `New Elegant Smile Case: ${newCase.patientName}`,
        html: `<h1>New Case Added</h1>${caseDetails}<p>This is an automated notification.</p>`,
    };

    try {
        await sgMail.send(msg);
        return { success: true, message: 'Email sent successfully.' };
    } catch (error: any) {
        console.error('Email sending error:', error.response?.body || error);
        return { success: false, error: 'Failed to send email notification.' };
    }
};
