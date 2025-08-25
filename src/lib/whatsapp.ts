// src/lib/whatsapp.ts
import twilio from 'twilio';
import type { DentalCase } from '@/types';

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_WHATSAPP_FROM;
const toNumber = process.env.WHATSAPP_RECIPIENT_NUMBER;

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
        const messageBody = `*New Case Added to Elegant Smile*

*Patient:* ${newCase.patientName}
*Dentist:* ${newCase.dentistName}
*Units:* ${toothCount} (${newCase.toothNumbers})
*Material:* ${newCase.material}
*Prosthesis:* ${newCase.prosthesisType}
*Source:* ${newCase.source || 'Desktop'}`;

        const message = await client.messages.create({
            body: messageBody,
            from: `whatsapp:${fromNumber}`,
            to: `whatsapp:${toNumber}`
        });
        console.log('WhatsApp notification sent successfully, SID:', message.sid);
    } catch (error) {
        console.error('Failed to send WhatsApp notification:', error);
    }
};
