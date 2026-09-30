// src/server/emailtemplates/adminNotification.js

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
 * Generates the admin notification email for new contact form submissions.
 * @param {Object} formData - The contact form data.
 * @param {string} formData.name - Customer's name.
 * @param {string} formData.email - Customer's email.
 * @param {string} formData.subject - Customer's subject line.
 * @param {string} formData.message - Customer's message.
 * @param {string} [formData.phone] - Customer's phone number (optional).
 * @param {string} [formData.priority] - Priority level (optional).
 * @param {string} ticketId - Unique identifier for the support request.
 * @returns {EmailContent} Object containing subject, HTML body, and text body.
 */
export const generateAdminNotificationEmail = (formData, ticketId) => {
    const { name, email, subject: customerSubject, message, phone, priority } = formData;
    const subject = `🌱 New Support Request #${ticketId} - ${customerSubject}`;

    const textBody = `New Support Request Received

Ticket ID: ${ticketId}
Name: ${name}
Email: ${email}
Phone: ${phone || 'Not provided'}
Priority: ${priority || 'Normal'}
Subject: ${customerSubject}

Message:
${message}

Submitted at: ${new Date().toLocaleString()}

Auto-response sent to customer: ✅`;

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
                padding: 20px; 
                text-align: center; 
            }
            .email-header h1 { 
                color: white; 
                margin: 0; 
                font-size: 20px; 
                font-weight: 600; 
            }
            .email-content { 
                padding: 30px; 
                background-color: ${colors.white}; 
            }
            .info-grid { 
                display: grid; 
                grid-template-columns: 1fr 1fr; 
                gap: 15px; 
                margin: 20px 0; 
            }
            .info-item { 
                background-color: ${colors.lightGray}; 
                padding: 15px; 
                border-radius: 4px; 
            }
            .info-item.full-width {
                grid-column: 1 / -1;
            }
            .info-label { 
                font-weight: bold; 
                color: ${colors.accent}; 
                display: block; 
                margin-bottom: 5px; 
            }
            .message-box { 
                background-color: #f8f9fa; 
                padding: 20px; 
                border-radius: 4px; 
                margin: 20px 0; 
                border-left: 4px solid ${colors.primary}; 
            }
            .ticket-id { 
                background-color: ${colors.accent}; 
                color: white; 
                padding: 10px; 
                border-radius: 4px; 
                text-align: center; 
                font-weight: bold; 
                margin: 15px 0; 
            }
            .priority-high { 
                background-color: #ff6b6b; 
                color: white; 
                padding: 4px 8px; 
                border-radius: 4px; 
                font-size: 12px; 
                font-weight: bold; 
            }
            .priority-critical { 
                background-color: #d63031; 
                color: white; 
                padding: 4px 8px; 
                border-radius: 4px; 
                font-size: 12px; 
                font-weight: bold; 
            }
            .priority-normal { 
                background-color: ${colors.primary}; 
                color: white; 
                padding: 4px 8px; 
                border-radius: 4px; 
                font-size: 12px; 
                font-weight: bold; 
            }
            .priority-low { 
                background-color: #74b9ff; 
                color: white; 
                padding: 4px 8px; 
                border-radius: 4px; 
                font-size: 12px; 
                font-weight: bold; 
            }
            .status-footer {
                background-color: ${colors.lightGray};
                padding: 15px;
                border-radius: 4px;
                margin-top: 20px;
                font-size: 14px;
                color: ${colors.textLight};
            }
            p { 
                margin: 16px 0; 
            }
            
            @media (max-width: 600px) {
                .info-grid {
                    grid-template-columns: 1fr;
                }
            }
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="email-header">
                <h1>🌱 New Support Request</h1>
            </div>
            <div class="email-content">
                <div class="ticket-id">Ticket ID: #${ticketId}</div>
                
                <div class="info-grid">
                    <div class="info-item">
                        <span class="info-label">Customer Name:</span>
                        ${name}
                    </div>
                    <div class="info-item">
                        <span class="info-label">Email:</span>
                        <a href="mailto:${email}" style="color: ${colors.accent}; text-decoration: none;">${email}</a>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Phone:</span>
                        ${phone ? `<a href="tel:${phone}" style="color: ${colors.accent}; text-decoration: none;">${phone}</a>` : 'Not provided'}
                    </div>
                    <div class="info-item">
                        <span class="info-label">Priority:</span>
                        <span class="priority-${(priority || 'normal').toLowerCase()}">${priority || 'Normal'}</span>
                    </div>
                </div>

                <div class="info-item full-width" style="margin: 20px 0;">
                    <span class="info-label">Subject:</span>
                    ${customerSubject}
                </div>

                <div class="message-box">
                    <span class="info-label">Customer Message:</span>
                    <p style="margin-top: 10px; white-space: pre-wrap;">${message}</p>
                </div>

                <div class="status-footer">
                    <p style="margin: 0;">
                        <strong>Submitted:</strong> ${new Date().toLocaleString()}<br>
                        <strong>Auto-response sent to customer:</strong> ✅<br>
                        <strong>Response due within:</strong> 24 hours
                    </p>
                </div>

                <div style="text-align: center; margin-top: 20px;">
                    <a href="mailto:${email}?subject=Re: ${customerSubject} [Ticket #${ticketId}]" 
                       style="
                           display: inline-block; 
                           background-color: ${colors.accent}; 
                           color: white; 
                           text-decoration: none; 
                           padding: 12px 24px; 
                           border-radius: 4px; 
                           font-weight: 500;
                       ">
                        Reply to Customer
                    </a>
                </div>
            </div>
        </div>
    </body>
    </html>`;

    return { subject, htmlBody, textBody };
};