// src/server/actions/emailActions.js

import { HttpError } from 'wasp/server';
import crypto from 'node:crypto';
import { Resend } from 'resend';
import bcrypt from 'bcryptjs';

// Import email templates
import { generatePasswordResetEmail } from '../emailtemplates/passwordReset.js';
import { generateWelcomeEmail } from '../emailtemplates/welcome.js';
import { generateContactAutoResponse } from '../utils/contactAutoResponse.js';
import { generateAdminNotificationEmail } from '../emailtemplates/adminNotification.js';

// --- Resend Setup ---
if (!process.env.RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY environment variable is not set');
    throw new Error('RESEND_API_KEY is required for email functionality');
}

if (!process.env.RESEND_DEFAULT_FROM_EMAIL || !process.env.RESEND_DEFAULT_FROM_EMAIL.includes('@')) {
    console.warn('⚠️ RESEND_DEFAULT_FROM_EMAIL is not configured properly');
}

const resend = new Resend(process.env.RESEND_API_KEY);
const defaultFromEmail = process.env.RESEND_DEFAULT_FROM_EMAIL || 'noreply@botani-buddy.us';
const defaultFromName = defaultFromEmail.includes('<') ? defaultFromEmail.split('<')[0].trim() : 'Botani-Buddy';
const defaultFromAddress = defaultFromEmail.includes('<') ? defaultFromEmail.match(/<(.+)>/)[1] : defaultFromEmail;

if (!defaultFromAddress || !/\S+@\S+\.\S+/.test(defaultFromAddress) || defaultFromAddress === 'noreply@example.com') {
    console.error('❌ Invalid RESEND_DEFAULT_FROM_EMAIL configuration');
    throw new Error('Invalid email configuration');
}

// --- Admin Email Addresses ---
const ADMIN_EMAILS = ['admin@botani-buddy.us', 'bradley@botani-buddy.us'];

// --- Constants ---
const PASSWORD_RESET_TOKEN_EXPIRATION_MINUTES = 60;
const SALT_ROUNDS = 10;

// --- JSDoc Type Definitions ---
/** @typedef {Object} RequestPasswordResetArgs */
/** @typedef {Object} SendWelcomeEmailArgs */
/** @typedef {Object} SendWelcomeEmailResult */
/** @typedef {Object} SendContactFormEmailArgs */
/** @typedef {{subject: string, htmlBody: string, textBody: string}} EmailContent */

// --- Utility Functions ---

/**
 * Safely sends an email with error handling and logging.
 * @param {Object} emailData - Email data for Resend API.
 * @param {string} logContext - Context for logging (e.g., 'password reset', 'welcome email').
 * @returns {Promise<Object>} Result object with success status and data/error.
 */
const sendEmailSafely = async (emailData, logContext) => {
    try {
        console.log(`[${logContext}] Attempting to send email to: ${emailData.to[0]}`);
        
        const { data, error } = await resend.emails.send(emailData);
        
        if (error) {
            console.error(`[${logContext}] Resend API error:`, error);
            return { success: false, error: error.message || 'Email send failed' };
        }
        
        console.log(`[${logContext}] Email sent successfully. Message ID: ${data.id}`);
        return { success: true, data };
        
    } catch (error) {
        console.error(`[${logContext}] Exception sending email:`, error);
        return { success: false, error: error.message || 'Unknown email error' };
    }
};

// --- Main Action Functions ---

/**
 * Handles contact form submissions - sends auto-response to customer and notification to admins.
 * @param {SendContactFormEmailArgs} args - Contact form data.
 * @param {object} context - Wasp action context.
 * @returns {Promise<{success: boolean, ticketId?: string, error?: string}>}
 */
export const sendContactFormEmail = async (args, context) => {
    const { name, email, subject: customerSubject, message, phone, priority } = args;
    
    console.log(`[sendContactFormEmail] Processing contact form submission from: ${email}`);

    // Validate input
    if (!name || !email || !customerSubject || !message) {
        console.error('[sendContactFormEmail] Missing required fields');
        return { success: false, error: 'Missing required fields' };
    }

    if (!defaultFromAddress || defaultFromAddress === 'noreply@example.com') {
        console.error('[sendContactFormEmail] Email service not configured properly');
        return { success: false, error: 'Email service not configured' };
    }

    try {
        // Generate unique ticket ID
        const ticketId = `BB${Date.now().toString().slice(-6)}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
        
        console.log(`[sendContactFormEmail] Generated ticket ID: ${ticketId}`);

        // 1. Send auto-response to customer
        const customerEmailContent = generateContactAutoResponse(name, ticketId, process.env.WASP_WEB_CLIENT_URL);
        
        const customerResult = await sendEmailSafely({
            from: `Botani-Buddy Support <${defaultFromAddress}>`,
            to: [email],
            subject: customerEmailContent.subject,
            html: customerEmailContent.htmlBody,
            text: customerEmailContent.textBody,
        }, 'sendContactFormEmail - customer auto-response');

        if (!customerResult.success) {
            console.error(`[sendContactFormEmail] Failed to send customer auto-response:`, customerResult.error);
            return { success: false, error: 'Failed to send confirmation email' };
        }

        // 2. Send admin notification
        const adminEmailContent = generateAdminNotificationEmail(args, ticketId);
        
        const adminResult = await sendEmailSafely({
            from: `Botani-Buddy System <${defaultFromAddress}>`,
            to: ADMIN_EMAILS,
            subject: adminEmailContent.subject,
            html: adminEmailContent.htmlBody,
            text: adminEmailContent.textBody,
        }, 'sendContactFormEmail - admin notification');

        if (!adminResult.success) {
            console.error(`[sendContactFormEmail] Failed to send admin notification:`, adminResult.error);
            // Don't fail the whole operation if admin email fails
        }

        return { 
            success: true, 
            ticketId,
            customerEmailId: customerResult.data.id,
            adminEmailId: adminResult.data?.id
        };

    } catch (error) {
        console.error(`[sendContactFormEmail] Exception:`, error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error processing contact form' 
        };
    }
};

/**
 * Handles a request to reset a user's password via email.
 * @param {RequestPasswordResetArgs} args - Arguments with user's email.
 * @param {object} context - Wasp action context with entities.User.
 * @returns {Promise<void>} Returns nothing to prevent enumeration attacks.
 */
export const requestPasswordReset = async (args, context) => {
    const { email } = args;
    console.log(`[requestPasswordReset] Called for identifier: ${email}`);

    // 1. Validate input & config
    if (!email || typeof email !== 'string' || !/\S+@\S+\.\S+/.test(email)) {
        console.log('[requestPasswordReset] Invalid email format');
        return; // Don't reveal invalid emails
    }
    
    if (!defaultFromAddress || defaultFromAddress === 'noreply@example.com') {
        console.error('[requestPasswordReset] Email service not configured');
        return;
    }

    try {
        // 2. Get User entity
        const UserEntity = context.entities?.User;
        if (!UserEntity) {
            console.error('[requestPasswordReset] User entity not available in context');
            throw new HttpError(500, "Database configuration error");
        }

        // 3. Find User
        const user = await UserEntity.findFirst({ 
            where: { 
                auth: { 
                    identities: { 
                        some: { 
                            providerName: 'username', 
                            providerUserId: { equals: email, mode: 'insensitive' } 
                        } 
                    } 
                } 
            } 
        });

        // 4. Handle User Not Found (silently for security)
        if (!user) {
            console.log(`[requestPasswordReset] User not found for email: ${email}`);
            return; // Don't reveal whether user exists
        }
        
        console.log(`[requestPasswordReset] Found user ID: ${user.id}`);

        // 5. Generate & Hash Token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = await bcrypt.hash(resetToken, SALT_ROUNDS);

        // 6. Calculate Expiry
        const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_EXPIRATION_MINUTES * 60 * 1000);

        // 7. Update User Record
        await UserEntity.update({ 
            where: { id: user.id }, 
            data: { 
                passwordResetToken: hashedToken, 
                passwordResetTokenExpiresAt: expiresAt 
            } 
        });

        // 8. Construct Reset URL
        const clientUrl = process.env.WASP_WEB_CLIENT_URL;
        if (!clientUrl) {
            console.error('[requestPasswordReset] WASP_WEB_CLIENT_URL not configured');
            return;
        }
        
        const resetUrl = `${clientUrl.replace(/\/$/, '')}/reset-password?token=${resetToken}`;

        // 9. Generate Email Content using Template
        const emailContent = generatePasswordResetEmail(resetUrl, PASSWORD_RESET_TOKEN_EXPIRATION_MINUTES);

        // 10. Send Email
        const emailResult = await sendEmailSafely({
            from: `${defaultFromName} <${defaultFromAddress}>`,
            to: [email],
            subject: emailContent.subject,
            html: emailContent.htmlBody,
            text: emailContent.textBody,
        }, 'requestPasswordReset');

        if (!emailResult.success) {
            console.error(`[requestPasswordReset] Failed to send password reset email to ${email}`);
        }

    } catch (error) {
        console.error("[requestPasswordReset] Error during process:", error);
        if (error instanceof HttpError) { 
            throw error; 
        }
        // Don't throw for other errors to prevent information disclosure
    }
};

/**
 * Sends a welcome email to a new user using Resend.
 * @param {SendWelcomeEmailArgs} args - Arguments with recipient details.
 * @param {object} context - Wasp action context.
 * @returns {Promise<SendWelcomeEmailResult>} Result object.
 */
export const sendWelcomeEmail = async (args, context) => {
    const { toEmail, userName } = args;
    const displayName = userName || 'Plant Enthusiast';
    const clientUrl = process.env.WASP_WEB_CLIENT_URL || 'http://localhost:3000';

    console.log(`[sendWelcomeEmail] Attempting to send welcome email to: ${toEmail}`);

    // Validate input & config
    if (!toEmail || typeof toEmail !== 'string' || !/\S+@\S+\.\S+/.test(toEmail)) {
        console.error('[sendWelcomeEmail] Invalid email address');
        return { success: false, error: "Invalid email address provided" };
    }
    
    if (!defaultFromAddress || defaultFromAddress === 'noreply@example.com') {
        console.error('[sendWelcomeEmail] Email service not configured');
        return { success: false, error: "Email service configuration error" };
    }

    try {
        // Generate Email Content using Template
        const emailContent = generateWelcomeEmail(displayName, clientUrl);

        // Send the welcome email
        const emailResult = await sendEmailSafely({
            from: `${defaultFromName} <${defaultFromAddress}>`,
            to: [toEmail],
            subject: emailContent.subject,
            html: emailContent.htmlBody,
            text: emailContent.textBody,
        }, 'sendWelcomeEmail');

        if (!emailResult.success) {
            return { success: false, error: emailResult.error || "Failed to send welcome email" };
        }

        return { success: true, messageId: emailResult.data.id };
        
    } catch (error) {
        console.error(`[sendWelcomeEmail] Exception:`, error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : "Unknown error sending welcome email" 
        };
    }
};