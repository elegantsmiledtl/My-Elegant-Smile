
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
    console.log("Twilio client initialized with Account SID:", accountSid);
    client = twilio(accountSid, authToken);
} else {
    console.error("Twilio Account SID or Auth Token is missing. Cannot initialize Twilio client.");
}

export const sendNewCaseNotification = async (newCase: Omit<DentalCase, 'id' | 'createdAt'>) => {
    if (!client || !fromNumber || !toNumber) {
        console.error('Twilio client is not available or phone numbers are missing in .env file. Skipping WhatsApp notification.');
        console.log({
            isClientInitialized: !!client,
            fromNumber: fromNumber,
            toNumber: toNumber
        });
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

        console.log(`Attempting to send WhatsApp message from: ${fromNumber} to: ${toNumber}`);

        const message = await client.messages.create({
            contentSid: contentSid,
            contentVariables: JSON.stringify({
                '1': `New case added for ${newCase.patientName}`, // Example for template placeholder {{1}}
                '2': caseDetails,                             // Example for template placeholder {{2}}
            }),
            from: fromNumber,
            to: toNumber
        });
        console.log('WhatsApp notification sent successfully! SID:', message.sid);
    } catch (error) {
        console.error('Failed to send WhatsApp notification. Error:', error);
    }
};

