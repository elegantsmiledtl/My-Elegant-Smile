
'use server';

import twilio from 'twilio';
import type { DentalCase } from '@/types';

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_WHATSAPP_FROM;
const toNumber = process.env.WHATSAPP_RECIPIENT_NUMBER;
const contentSid = 'HX350d429d32e64a552466cafecbe95f3c';

let client: twilio.Twilio | null = null;
if (accountSid && authToken) {
    client = twilio(accountSid, authToken);
}

export const sendNewCaseNotification = async (newCase: Omit<DentalCase, 'id' | 'createdAt'>) => {
    if (!client || !fromNumber || !toNumber) {
        console.error('Twilio credentials or recipient number are not configured in .env file. Skipping WhatsApp notification.');
        return;
    }

    try {
        const toothCount = newCase.toothNumbers.split(',').filter(t => t.trim()).length;
        
        // Construct the detailed message for the template variable
        const caseDetails = `
Patient: ${newCase.patientName}
Dentist: ${newCase.dentistName}
Units: ${toothCount} (${newCase.toothNumbers})
Material: ${newCase.material}
Prosthesis: ${newCase.prosthesisType}
Source: ${newCase.source || 'Desktop'}
Delivery Date: ${newCase.deliveryDate ? new Date(newCase.deliveryDate).toLocaleDateString() : 'N/A'}`;

        const message = await client.messages.create({
            contentSid: contentSid,
            contentVariables: JSON.stringify({
                '1': `New case added for ${newCase.patientName}`, // Example for template placeholder {{1}}
                '2': caseDetails,                             // Example for template placeholder {{2}}
            }),
            from: `whatsapp:${fromNumber}`,
            to: `whatsapp:${toNumber}`
        });
        console.log('WhatsApp notification sent successfully using Content Template, SID:', message.sid);
    } catch (error) {
        console.error('Failed to send WhatsApp notification using Content Template:', error);
    }
};
