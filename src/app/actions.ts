
'use server';

import twilio from 'twilio';
import type { DentalCase } from '@/types';

export const sendNewCaseNotification = async (newCase: Omit<DentalCase, 'id' | 'createdAt'>) => {
    console.log("--- Starting sendNewCaseNotification ---");

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_WHATSAPP_FROM;
    const toNumbers = process.env.WHATSAPP_RECIPIENT_NUMBER;

    // Detailed logging of environment variables
    console.log(`TWILIO_ACCOUNT_SID: ${accountSid ? 'Loaded' : 'MISSING!'}`);
    console.log(`TWILIO_AUTH_TOKEN: ${authToken ? 'Loaded' : 'MISSING!'}`);
    console.log(`TWILIO_WHATSAPP_FROM: ${fromNumber || 'MISSING!'}`);
    console.log(`WHATSAPP_RECIPIENT_NUMBER: ${toNumbers || 'MISSING!'}`);

    if (!accountSid || !authToken || !fromNumber || !toNumbers) {
        const missingVars = [
            !accountSid && "TWILIO_ACCOUNT_SID",
            !authToken && "TWILIO_AUTH_TOKEN",
            !fromNumber && "TWILIO_WHATSAPP_FROM",
            !toNumbers && "WHATSAPP_RECIPIENT_NUMBER"
        ].filter(Boolean).join(', ');

        const errorMsg = `Cannot send notification. Server is missing environment variables: ${missingVars}. Please check your .env file and restart the server.`;
        console.error(errorMsg);
        return { success: false, error: errorMsg, details: [] };
    }

    try {
        const client = twilio(accountSid, authToken);
        console.log("Twilio client initialized successfully inside the function.");

        const toothCount = newCase.toothNumbers.split(',').filter(t => t.trim()).length;
        
        const caseDetails = `
Patient: ${newCase.patientName}
Dentist: ${newCase.dentistName}
Units: ${toothCount} (${newCase.toothNumbers})
Material: ${newCase.material}
Prosthesis: ${newCase.prosthesisType}
Source: ${newCase.source || 'Desktop'}
Delivery Date: ${newCase.deliveryDate ? new Date(newCase.deliveryDate).toLocaleDateString() : 'N/A'}`;

        const messageBody = `*New Elegant Smile Case*\n${caseDetails}`;
        const fromNumberFormatted = `whatsapp:${fromNumber}`;
        const recipientList = toNumbers.split(',').map(num => num.trim()).filter(Boolean);
        
        console.log("Message Body:", messageBody);
        console.log("From Number:", fromNumberFormatted);
        console.log("Recipient List:", recipientList);

        const results = [];
        
        for (const toNumber of recipientList) {
            const toNumberFormatted = `whatsapp:${toNumber}`;
            try {
                console.log(`Attempting to send message to: ${toNumberFormatted}`);
                const message = await client.messages.create({
                    body: messageBody,
                    from: fromNumberFormatted,
                    to: toNumberFormatted
                });
                console.log(`Message sent successfully to ${toNumber}! SID: ${message.sid}`);
                results.push({ number: toNumber, success: true, sid: message.sid });
            } catch (error: any) {
                const errorMessage = error.message || "An unknown Twilio error occurred";
                console.error(`Failed to send message to ${toNumber}. Error Code: ${error.code}. Message: ${errorMessage}`);
                results.push({ number: toNumber, success: false, error: `Code ${error.code || 'N/A'}: ${errorMessage}` });
            }
        }

        const allSuccessful = results.every(r => r.success);
        const finalMessage = allSuccessful 
            ? `Successfully sent notifications to all ${results.length} recipient(s).`
            : `Finished sending notifications with one or more errors.`;

        console.log("--- Finished sendNewCaseNotification ---");
        return { 
            success: allSuccessful, 
            message: finalMessage,
            details: results 
        };

    } catch (error: any) {
        console.error("A critical error occurred in sendNewCaseNotification:", error);
        return { success: false, error: error.message, details: [] };
    }
};
