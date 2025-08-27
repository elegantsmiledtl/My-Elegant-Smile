
'use server';

import twilio from 'twilio';
import type { DentalCase } from '@/types';

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_WHATSAPP_FROM;
// WHATSAPP_RECIPIENT_NUMBER can now be a comma-separated list of numbers
const toNumbers = process.env.WHATSAPP_RECIPIENT_NUMBER;

let client: twilio.Twilio | null = null;

if (accountSid && authToken && fromNumber) {
    console.log("Twilio client initialized with Account SID:", accountSid);
    console.log("Using Twilio 'From' number:", fromNumber);
    client = twilio(accountSid, authToken);
} else {
    console.error("Twilio environment variables are missing. Check .env for TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM.");
}

export const sendNewCaseNotification = async (newCase: Omit<DentalCase, 'id' | 'createdAt'>) => {
    console.log("--- Starting sendNewCaseNotification ---");
    console.log("Attempting to send notifications for patient:", newCase.patientName);
    
    if (!client || !fromNumber || !toNumbers) {
        const missingVars = [
            !client && "Twilio Client (check .env for TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)",
            !fromNumber && "Twilio From Number (check .env for TWILIO_WHATSAPP_FROM)",
            !toNumbers && "Recipient Number(s) (check .env for WHATSAPP_RECIPIENT_NUMBER)"
        ].filter(Boolean).join(', ');

        const errorMsg = `Cannot send notification because of missing configuration: ${missingVars}.`;
        console.error(errorMsg);
        return { success: false, error: errorMsg, details: [] };
    }

    const toothCount = newCase.toothNumbers.split(',').filter(t => t.trim()).length;
    
    const caseDetails = `
Patient: ${newCase.patientName}
Dentist: ${newCase.dentistName}
Units: ${toothCount} (${newCase.toothNumbers})
Material: ${newCase.material}
Prosthesis: ${newCase.prosthesisType}
Source: ${newCase.source || 'Desktop'}
Delivery Date: ${newCase.deliveryDate ? new Date(newCase.deliveryDate).toLocaleDateString() : 'N/A'}`;

    const messageBody = `*New Elegant Smile Case* ${caseDetails}`;

    const recipientList = toNumbers.split(',').map(num => num.trim());
    console.log("Parsed recipient numbers:", recipientList);

    const results = [];
    
    for (const toNumber of recipientList) {
        if (!toNumber) continue;

        try {
            console.log(`Attempting to send WhatsApp message from: ${fromNumber} to: ${toNumber}`);
            const message = await client.messages.create({
                body: messageBody,
                from: `whatsapp:${fromNumber}`, // Ensure 'whatsapp:' prefix is here for the 'from' number
                to: `whatsapp:${toNumber}`      // Ensure 'whatsapp:' prefix is here for the 'to' number
            });
            console.log(`WhatsApp notification sent successfully to ${toNumber}! SID:`, message.sid);
            results.push({ number: toNumber, success: true, sid: message.sid });
        } catch (error: any) {
            const errorMessage = error.message || "An unknown Twilio error occurred";
            console.error(`Failed to send WhatsApp notification to ${toNumber}. Error Code: ${error.code}, Message:`, errorMessage);
            results.push({ number: toNumber, success: false, error: `Code ${error.code}: ${errorMessage}` });
        }
    }

    const allSuccessful = results.every(r => r.success);
    const finalMessage = allSuccessful 
        ? `Successfully sent notifications to all ${results.length} number(s).`
        : `Finished sending notifications with some errors.`;

    console.log("--- Finished sendNewCaseNotification ---");
    return { 
        success: allSuccessful, 
        message: finalMessage,
        details: results 
    };
};
