// src/server/emailtemplates/index.js
// Central export hub for all email templates

export { generatePasswordResetEmail } from './passwordReset.js';
export { generateWelcomeEmail } from './welcome.js';
export { generateContactAutoResponse } from '../utils/contactAutoResponse.js';
export { generateAdminNotificationEmail } from './adminNotification.js';
export { emailColors } from './colors.js';

// Template metadata for documentation/tooling
export const emailTemplates = {
    passwordReset: {
        name: 'Password Reset',
        description: 'Email sent when users request password reset',
        requiredParams: ['resetUrl'],
        optionalParams: ['expirationMinutes']
    },
    welcome: {
        name: 'Welcome Email',
        description: 'Email sent to new users after registration',
        requiredParams: ['displayName', 'clientUrl'],
        optionalParams: []
    },
    contactAutoResponse: {
        name: 'Contact Auto-Response',
        description: 'Automatic confirmation email for contact form submissions',
        requiredParams: ['customerName', 'ticketId'],
        optionalParams: ['clientUrl']
    },
    adminNotification: {
        name: 'Admin Notification',
        description: 'Email sent to admins for new contact form submissions',
        requiredParams: ['formData', 'ticketId'],
        optionalParams: []
    }
};