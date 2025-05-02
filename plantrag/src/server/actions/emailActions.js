// src/server/actions/emailActions.js

import { HttpError } from 'wasp/server';
import crypto from 'node:crypto';
import { Resend } from 'resend';
import bcrypt from 'bcryptjs'; // Use bcryptjs consistently

// --- Resend Setup (Keep as is) ---
if (!process.env.RESEND_API_KEY) { /* ... error handling ... */ }
if (!process.env.RESEND_DEFAULT_FROM_EMAIL || !process.env.RESEND_DEFAULT_FROM_EMAIL.includes('@')) { /* ... warning ... */ }
const resend = new Resend(process.env.RESEND_API_KEY);
const defaultFromEmail = process.env.RESEND_DEFAULT_FROM_EMAIL || 'noreply@example.com';
const defaultFromName = defaultFromEmail.includes('<') ? defaultFromEmail.split('<')[0].trim() : 'Botanical Assistant';
const defaultFromAddress = defaultFromEmail.includes('<') ? defaultFromEmail.match(/<(.+)>/)[1] : defaultFromEmail;
if (!defaultFromAddress || !/\S+@\S+\.\S+/.test(defaultFromAddress) || defaultFromAddress === 'noreply@example.com') { /* ... error handling ... */ }

// --- Color Palette (Keep as is) ---
const colors = {
    primary: '#4CAF50', secondary: '#7bb36b', textDark: '#333333', textLight: '#666666',
    background: '#f9faf5', white: '#ffffff', lightGray: '#f5f5f5', accent: '#4a7c59', accentHover: '#3d6649'
};

// --- Constants (Keep as is) ---
const PASSWORD_RESET_TOKEN_EXPIRATION_MINUTES = 60;
const SALT_ROUNDS = 10;

// --- JSDoc Type Definitions (Keep as is) ---
/** @typedef {Object} RequestPasswordResetArgs */
/** @typedef {Object} SendWelcomeEmailArgs */
/** @typedef {Object} SendWelcomeEmailResult */
/** @typedef {{subject: string, htmlBody: string, textBody: string}} EmailContent */

// --- Email Template Helper Functions ---

/**
 * Generates the content for the password reset email.
 * @param {string} resetUrl - The unique URL for the user to reset their password.
 * @returns {EmailContent} Object containing subject, HTML body, and text body.
 */
function _generatePasswordResetEmail(resetUrl) {
    const subject = 'Reset Your Botanical Assistant Password';

    const textBody = `Hello,\n\nYou requested a password reset for your Botanical Assistant account.\n\nPlease click the following link to set a new password:\n${resetUrl}\n\nThis link is valid for ${PASSWORD_RESET_TOKEN_EXPIRATION_MINUTES} minutes.\n\nIf you did not request a password reset, please ignore this email.\n\nThanks,\nThe Botanical Assistant Team`;

    const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: ${colors.textDark}; margin: 0; padding: 0; background-color: ${colors.background}; }
            .email-container { max-width: 600px; margin: 20px auto; background-color: ${colors.white}; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
            .email-header { background: linear-gradient(to right, ${colors.accent}, ${colors.secondary}); padding: 30px 20px; text-align: center; }
            .email-header h1 { color: white; margin: 0; font-size: 24px; font-weight: 600; }
            .email-content { padding: 30px; background-color: ${colors.white}; }
            .email-footer { background-color: ${colors.lightGray}; padding: 20px; text-align: center; font-size: 12px; color: ${colors.textLight}; }
            .logo { font-size: 36px; margin-bottom: 10px; color: ${colors.white}; }
            .button { display: inline-block; background-color: ${colors.accent}; color: ${colors.white} !important; text-decoration: none; padding: 12px 30px; border-radius: 4px; font-weight: 500; margin: 20px 0; transition: background-color 0.2s; }
            .button:hover { background-color: ${colors.accentHover}; }
            .expiry-note { font-size: 14px; color: ${colors.textLight}; margin-top: 20px; font-style: italic; }
            p { margin: 16px 0; }
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="email-header"><div class="logo">🌱</div><h1>Botanical Assistant</h1></div>
            <div class="email-content">
                <p>Hello,</p>
                <p>We received a request to reset your password for the Botanical Assistant. To set a new password, please click the button below:</p>
                <div style="text-align: center;"><a href="${resetUrl}" class="button">Reset My Password</a></div>
                <p>If you didn't request this password reset, you can safely ignore this email and your password will remain unchanged.</p>
                <div class="expiry-note">This link will expire in ${PASSWORD_RESET_TOKEN_EXPIRATION_MINUTES} minutes for security reasons.</div>
            </div>
            <div class="email-footer">
                © ${new Date().getFullYear()} Botanical Assistant. All rights reserved.
                <p>This email was sent automatically. Please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>`;

    return { subject, htmlBody, textBody };
}

/**
 * Generates the content for the welcome email.
 * @param {string} displayName - The name to address the user by.
 * @param {string} clientUrl - The base URL of the web application.
 * @returns {EmailContent} Object containing subject, HTML body, and text body.
 */
function _generateWelcomeEmail(displayName, clientUrl) {
    const subject = 'Welcome to Botanical Assistant! 🌱';

    const textBody = `Hello ${displayName},\n\nWelcome to Botanical Assistant! We're excited to have you join our community...\n\nGet started now: ${clientUrl}\n\nHappy Planting!\nThe Botanical Assistant Team`; // Keep full text as before

    const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Botanical Assistant</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: ${colors.textDark}; margin: 0; padding: 0; background-color: ${colors.background}; }
            .email-container { max-width: 600px; margin: 20px auto; background-color: ${colors.white}; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
            .email-header { background: linear-gradient(to right, ${colors.accent}, ${colors.secondary}); padding: 30px 20px; text-align: center; }
            .email-header h1 { color: white; margin: 0; font-size: 24px; font-weight: 600; }
            .email-content { padding: 30px; background-color: ${colors.white}; }
            .email-footer { background-color: ${colors.lightGray}; padding: 20px; text-align: center; font-size: 12px; color: ${colors.textLight}; }
            .logo { font-size: 36px; margin-bottom: 10px; color: ${colors.white}; }
            .button { display: inline-block; background-color: ${colors.accent}; color: ${colors.white} !important; text-decoration: none; padding: 12px 30px; border-radius: 4px; font-weight: 500; margin: 20px 0; transition: background-color 0.2s; }
            .button:hover { background-color: ${colors.accentHover}; }
            .feature-list { margin: 25px 0; padding-left: 0; list-style: none; }
            .feature-item { display: flex; align-items: flex-start; margin: 15px 0; color: ${colors.textDark}; }
            .feature-icon { margin-right: 15px; font-size: 20px; color: ${colors.primary}; width: 25px; text-align: center; }
            .feature-text { flex: 1; color: ${colors.textMedium}; }
            .feature-text strong { color: ${colors.textDark}; }
            .cta-section { background-color: ${colors.lightGray}; padding: 25px; border-radius: 4px; margin: 30px 0; text-align: center; }
            p { margin: 16px 0; }
        </style>
    </head>
    <body>
        <div class="email-container">
             <div class="email-header"><div class="logo">🌱</div><h1>Welcome to Botanical Assistant!</h1></div>
             <div class="email-content">
                  <p>Hello ${displayName},</p>
                  <p>Thank you for joining the Botanical Assistant community! ...</p> {/* Keep full content */}
                  <ul class="feature-list">
                       {/* Keep feature list items */}
                  </ul>
                  <div class="cta-section">
                       <p><strong>Ready to start exploring?</strong></p>
                       <a href="${clientUrl}" class="button">Visit Your Dashboard</a>
                  </div>
                  <p>Happy planting,<br>The Botanical Assistant Team</p>
             </div>
             <div class="email-footer">
                  © ${new Date().getFullYear()} Botanical Assistant. All rights reserved.
                  <p>This is an automated message...</p>
             </div>
        </div>
    </body>
    </html>`; // Keep full HTML content as before

    return { subject, htmlBody, textBody };
}


// --- Main Action Functions ---

/**
 * Handles a request to reset a user's password via email.
 * Refactored to use helper function for email content generation.
 * @param {RequestPasswordResetArgs} args - Arguments with user's email.
 * @param {object} context - Wasp action context with entities.User.
 * @returns {Promise<void>} Returns nothing to prevent enumeration attacks.
 */
export const requestPasswordReset = async (args, context) => {
    const { email } = args;
    console.log(`Action: requestPasswordReset called for identifier: ${email}`);

    // 1. Validate input & config (Keep as before)
    if (!email || typeof email !== 'string' || !/\S+@\S+\.\S+/.test(email)) { /*...*/ return; }
    if (!defaultFromAddress || defaultFromAddress === 'noreply@example.com') { /*...*/ return; }

    try {
        // 2. Get User entity (Keep as before)
        const UserEntity = context.entities?.User;
        if (!UserEntity) { /*...*/ throw new HttpError(500, "..."); }

        // 3. Find User (Keep as before)
        const user = await UserEntity.findFirst({ where: { auth: { identities: { some: { providerName: 'username', providerUserId: { equals: email, mode: 'insensitive' } } } } } });

        // 4. Handle User Not Found (Keep as before)
        if (!user) { /*...*/ return; }
        console.log(`Action: requestPasswordReset - Found user ID: ${user.id}`);

        // 5. Generate & Hash Token (Keep as before)
        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = await bcrypt.hash(resetToken, SALT_ROUNDS);

        // 6. Calculate Expiry (Keep as before)
        const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_EXPIRATION_MINUTES * 60 * 1000);

        // 7. Update User Record (Keep as before)
        await UserEntity.update({ where: { id: user.id }, data: { passwordResetToken: hashedToken, passwordResetTokenExpiresAt: expiresAt } });

        // 8. Construct Reset URL (Keep as before)
        const clientUrl = process.env.WASP_WEB_CLIENT_URL;
        if (!clientUrl) { /*...*/ return; }
        const resetUrl = `${clientUrl.replace(/\/$/, '')}/reset-password?token=${resetToken}`;

        // 9. Generate Email Content using Helper Function
        const { subject, htmlBody, textBody } = _generatePasswordResetEmail(resetUrl);

        // 10. Send Email via Resend
        const recipientEmail = email;
        console.log(`Action: requestPasswordReset - Attempting send to: ${recipientEmail}`);
        try {
            const { data, error } = await resend.emails.send({
                from: `${defaultFromName} <${defaultFromAddress}>`,
                to: [recipientEmail], subject: subject, html: htmlBody, text: textBody,
            });

            if (error) { console.error(`Resend API error for ${recipientEmail}:`, error); }
            else { console.log(`Password reset email sent via Resend to ${recipientEmail}. ID: ${data.id}`); }
        } catch (emailError) { console.error(`Exception sending email via Resend to ${email}:`, emailError); }

    } catch (error) {
        console.error("Error during requestPasswordReset process:", error);
        if (error instanceof HttpError) { throw error; }
    }
};

/**
 * Sends a welcome email to a new user using Resend.
 * Refactored to use helper function for email content generation.
 * @param {SendWelcomeEmailArgs} args - Arguments with recipient details.
 * @param {object} context - Wasp action context.
 * @returns {Promise<SendWelcomeEmailResult>} Result object.
 */
export const sendWelcomeEmail = async (args, context) => {
    const { toEmail, userName } = args;
    const displayName = userName || 'Plant Enthusiast';
    const clientUrl = process.env.WASP_WEB_CLIENT_URL || 'http://localhost:3000';

    // Validate input & config (Keep as before)
    if (!toEmail || typeof toEmail !== 'string' || !/\S+@\S+\.\S+/.test(toEmail)) { /*...*/ return { success: false, error: "..." }; }
    if (!defaultFromAddress || defaultFromAddress === 'noreply@example.com') { /*...*/ return { success: false, error: "..." }; }

    console.log(`Action: sendWelcomeEmail - Attempting send to: ${toEmail}`);
    try {
        // Generate Email Content using Helper Function
        const { subject, htmlBody, textBody } = _generateWelcomeEmail(displayName, clientUrl);

        // Send the welcome email using Resend
        const { data, error } = await resend.emails.send({
            from: `${defaultFromName} <${defaultFromAddress}>`,
            to: [toEmail], subject: subject, html: htmlBody, text: textBody,
        });

        if (error) {
            console.error(`Failed to send welcome email to ${toEmail}:`, error);
            return { success: false, error: error.message || "Failed to send welcome email" };
        }

        console.log(`Welcome email sent successfully to ${toEmail}. Message ID: ${data.id}`);
        return { success: true, messageId: data.id };
    } catch (error) {
        console.error(`Exception sending welcome email to ${toEmail}:`, error);
        return { success: false, error: error instanceof Error ? error.message : "Unknown error sending welcome email" };
    }
};