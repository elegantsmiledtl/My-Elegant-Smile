
'use server';

import twilio from 'twilio';
import type { DentalCase } from '@/types';

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_WHATSAPP_FROM;
const toNumber = process.env.WHATSAPP_RECIPIENT_NUMBER;

let client: twilio.Twilio | null = null;

if (accountSid && authToken) {
    console.log("Twilio client initialized with Account SID:", accountSid);
    client = twilio(accountSid, authToken);
} else {
    console.error("Twilio Account SID or Auth Token is missing. Cannot initialize Twilio client.");
}

export const sendNewCaseNotification = async (newCase: Omit<DentalCase, 'id' | 'createdAt'>) => {
    // Explicitly check for all required configuration first.
    if (!client || !fromNumber || !toNumber) {
        const missingVars = [
            !client && "Twilio Client (check .env for TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN)",
            !fromNumber && "Twilio From Number (check .env for TWILIO_WHATSAPP_FROM)",
            !toNumber && "Recipient Number (check .env for WHATSAPP_RECIPIENT_NUMBER)"
        ].filter(Boolean).join(', ');

        const errorMsg = `Cannot send notification because of missing configuration: ${missingVars}.`;
        console.error(errorMsg);
        return { success: false, error: errorMsg };
    }

    try {
        const toothCount = newCase.toothNumbers.split(',').filter(t => t.trim()).length;
        
        // Construct the detailed message for the simple text body
        const caseDetails = `
Patient: ${newCase.patientName}
Dentist: ${newCase.dentistName}
Units: ${toothCount} (${newCase.toothNumbers})
Material: ${newCase.material}
Prosthesis: ${newCase.prosthesisType}
Source: ${newCase.source || 'Desktop'}
Delivery Date: ${newCase.deliveryDate ? new Date(newCase.deliveryDate).toLocaleDateString() : 'N/A'}`;

        const messageBody = `*New Elegant Smile Case* ${caseDetails}`;

        console.log(`Attempting to send WhatsApp message from: ${fromNumber} to: ${toNumber}`);

        const message = await client.messages.create({
            body: messageBody, // Using 'body' instead of 'contentSid'
            from: fromNumber,
            to: toNumber
        });

        console.log('WhatsApp notification sent successfully! SID:', message.sid);
        return { success: true, sid: message.sid };

    } catch (error: any) {
        const errorMessage = error.message || "An unknown Twilio error occurred";
        console.error('Failed to send WhatsApp notification. Error:', errorMessage);
        return { success: false, error: errorMessage };
    }
};
