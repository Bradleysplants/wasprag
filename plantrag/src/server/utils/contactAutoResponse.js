// src/server/emailtemplates/contactAutoResponse.js

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
 * Generates the auto-response email for contact form submissions.
 * @param {string} customerName - The name of the customer who submitted the form.
 * @param {string} ticketId - Unique identifier for the support request.
 * @param {string} [clientUrl] - Optional URL to the main application.
 * @returns {EmailContent} Object containing subject, HTML body, and text body.
 */
export const generateContactAutoResponse = (customerName, ticketId, clientUrl = 'https://botani-buddy.us') => {
    const subject = `We've received your message - Support Request #${ticketId}`;

    const textBody = `Hello ${customerName},

Thank you for contacting Botani-Buddy! We've received your support request and our team will get back to you within 24 hours.

Your support ticket ID: ${ticketId}

Please keep this ID for your records. If you need to follow up, please reference this ticket number.

What happens next?
• Our support team will review your message
• You'll receive a personal response within 24 hours  
• We'll help you resolve your question or concern

In the meantime, feel free to explore our plant care assistant at ${clientUrl}

Best regards,
The Botani-Buddy Support Team`;

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
            .ticket-box { 
                background-color: ${colors.lightGray}; 
                padding: 20px; 
                border-radius: 4px; 
                margin: 20px 0; 
                text-align: center; 
            }
            .ticket-id { 
                font-size: 18px; 
                font-weight: bold; 
                color: ${colors.accent}; 
            }
            .support-info { 
                background-color: #e8f5e8; 
                padding: 20px; 
                border-radius: 4px; 
                margin: 20px 0; 
                border-left: 4px solid ${colors.primary}; 
            }
            .support-info ul {
                margin: 10px 0;
                padding-left: 20px;
            }
            .support-info li {
                margin: 8px 0;
                color: ${colors.textDark};
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
                <h1>Message Received!</h1>
            </div>
            <div class="email-content">
                <p>Hello ${customerName},</p>
                <p>Thank you for reaching out to Botani-Buddy! We've successfully received your support request and our team is on it.</p>
                
                <div class="ticket-box">
                    <p>Your Support Ticket ID:</p>
                    <div class="ticket-id">#${ticketId}</div>
                    <p style="font-size: 14px; color: ${colors.textLight}; margin-top: 10px;">
                        Please save this ID for your records
                    </p>
                </div>

                <div class="support-info">
                    <p><strong>What happens next?</strong></p>
                    <ul>
                        <li>Our support team will review your message</li>
                        <li>You'll receive a personal response within 24 hours</li>
                        <li>We'll help you resolve your question or concern</li>
                    </ul>
                </div>

                <p>In the meantime, feel free to continue using Botani-Buddy for all your plant care needs!</p>
                
                <p>Best regards,<br>The Botani-Buddy Support Team 🌿</p>
            </div>
            <div class="email-footer">
                © ${new Date().getFullYear()} Botani-Buddy. All rights reserved.
                <p>This is an automated response. Please do not reply to this email.</p>
                <p>For urgent matters, please visit our website at ${clientUrl.replace('https://', '').replace('http://', '')}</p>
            </div>
        </div>
    </body>
    </html>`;

    return { subject, htmlBody, textBody };
};