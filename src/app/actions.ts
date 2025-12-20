
'use server';

import type { DentalCase } from '@/types';

// The twilio and sendgrid libraries are not compatible with the App Hosting build environment.
// This functionality should be reimplemented using a Genkit flow or a Firebase Cloud Function.
export const sendNewCaseNotification = async (newCase: Omit<DentalCase, 'id' | 'createdAt'>) => {
    console.log("sendNewCaseNotification called, but is currently disabled.");
    return { success: true, message: 'Notification functionality is disabled.' };
};

export const sendNewCaseEmail = async (newCase: Omit<DentalCase, 'id' | 'createdAt'>) => {
    console.log("sendNewCaseEmail called, but is currently disabled.");
    return { success: true, message: 'Email functionality is disabled.' };
};
