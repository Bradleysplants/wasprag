// src/server/emailtemplates/passwordReset.js

// --- Color Palette ---
const colors = {
    primary: '#4CAF50', 
    secondary: '#7bb36b', 
    textDark: '#333333', 
    textLight: '#666666',
    background: '#f9faf5', 
    white: '#ffffff', 
    lightGray: '#f5f5f5', 
    accent: '#4a7c59', 
    accentHover: '#3d6649'
};

/**
 * Generates the content for the password reset email.
 * @param {string} resetUrl - The unique URL for the user to reset their password.
 * @param {number} expirationMinutes - How long the reset link is valid (default: 60 minutes).
 * @returns {EmailContent} Object containing subject, HTML body, and text body.
 */
export const generatePasswordResetEmail = (resetUrl, expirationMinutes = 60) => {
    const subject = 'Reset Your Botani-Buddy Password';

    const textBody = `Hello,

You requested a password reset for your Botani-Buddy account.

Please click the following link to set a new password:
${resetUrl}

This link is valid for ${expirationMinutes} minutes.

If you did not request a password reset, please ignore this email.

Thanks,
The Botani-Buddy Team`;

    const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
            body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                line-height: 1.6; 
                color: ${colors.textDark}; 
                margin: 0; 
                padding: 0; 
                background-color: ${colors.background}; 
            }
            .email-container { 
                max-width: 600px; 
                margin: 20px auto; 
                background-color: ${colors.white}; 
                border-radius: 8px; 
                overflow: hidden; 
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); 
            }
            .email-header { 
                background: linear-gradient(to right, ${colors.accent}, ${colors.secondary}); 
                padding: 30px 20px; 
                text-align: center; 
            }
            .email-header h1 { 
                color: white; 
                margin: 0; 
                font-size: 24px; 
                font-weight: 600; 
            }
            .email-content { 
                padding: 30px; 
                background-color: ${colors.white}; 
            }
            .email-footer { 
                background-color: ${colors.lightGray}; 
                padding: 20px; 
                text-align: center; 
                font-size: 12px; 
                color: ${colors.textLight}; 
            }
            .logo { 
                font-size: 36px; 
                margin-bottom: 10px; 
                color: ${colors.white}; 
            }
            .button { 
                display: inline-block; 
                background-color: ${colors.accent}; 
                color: ${colors.white} !important; 
                text-decoration: none; 
                padding: 12px 30px; 
                border-radius: 4px; 
                font-weight: 500; 
                margin: 20px 0; 
                transition: background-color 0.2s; 
            }
            .button:hover { 
                background-color: ${colors.accentHover}; 
            }
            .expiry-note { 
                font-size: 14px; 
                color: ${colors.textLight}; 
                margin-top: 20px; 
                font-style: italic; 
            }
            p { 
                margin: 16px 0; 
            }
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="email-header">
                <div class="logo">🌱</div>
                <h1>Botani-Buddy</h1>
            </div>
            <div class="email-content">
                <p>Hello,</p>
                <p>We received a request to reset your password for Botani-Buddy. To set a new password, please click the button below:</p>
                <div style="text-align: center;">
                    <a href="${resetUrl}" class="button">Reset My Password</a>
                </div>
                <p>If you didn't request this password reset, you can safely ignore this email and your password will remain unchanged.</p>
                <div class="expiry-note">
                    This link will expire in ${expirationMinutes} minutes for security reasons.
                </div>
            </div>
            <div class="email-footer">
                © ${new Date().getFullYear()} Botani-Buddy. All rights reserved.
                <p>This email was sent automatically. Please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>`;

    return { subject, htmlBody, textBody };
};