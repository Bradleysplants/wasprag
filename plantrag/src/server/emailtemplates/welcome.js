// src/server/emailtemplates/welcome.js

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
 * Generates the content for the welcome email.
 * @param {string} displayName - The name to address the user by.
 * @param {string} clientUrl - The base URL of the web application.
 * @returns {EmailContent} Object containing subject, HTML body, and text body.
 */
export const generateWelcomeEmail = (displayName, clientUrl) => {
    const subject = 'Welcome to Botani-Buddy! 🌱';

    const textBody = `Hello ${displayName},

Welcome to Botani-Buddy! We're excited to have you join our community of plant enthusiasts. Your personal plant care assistant is ready to help your green friends thrive.

Here's what you can do with Botani-Buddy:
• Get personalized plant care advice
• Identify unknown plants in your collection  
• Learn from our AI-powered botanical knowledge base
• Connect with fellow plant lovers

Get started now: ${clientUrl}

Happy Planting!
The Botani-Buddy Team`;

    const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Botani-Buddy</title>
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
            .feature-list { 
                margin: 25px 0; 
                padding-left: 0; 
                list-style: none; 
            }
            .feature-item { 
                display: flex; 
                align-items: flex-start; 
                margin: 15px 0; 
                color: ${colors.textDark}; 
            }
            .feature-icon { 
                margin-right: 15px; 
                font-size: 20px; 
                color: ${colors.primary}; 
                width: 25px; 
                text-align: center; 
            }
            .feature-text { 
                flex: 1; 
                color: ${colors.textLight}; 
            }
            .feature-text strong { 
                color: ${colors.textDark}; 
            }
            .cta-section { 
                background-color: ${colors.lightGray}; 
                padding: 25px; 
                border-radius: 4px; 
                margin: 30px 0; 
                text-align: center; 
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
                <h1>Welcome to Botani-Buddy!</h1>
            </div>
             <div class="email-content">
                  <p>Hello ${displayName},</p>
                  <p>Thank you for joining the Botani-Buddy community! We're excited to help you on your plant care journey.</p>
                  
                  <ul class="feature-list">
                      <li class="feature-item">
                          <span class="feature-icon">🌿</span>
                          <span class="feature-text">
                            <strong>Plant Care Guidance:</strong> Get personalized advice for your plants
                          </span>
                      </li>
                      <li class="feature-item">
                          <span class="feature-icon">🔍</span>
                          <span class="feature-text">
                            <strong>Plant Identification:</strong> Help identify unknown plants in your collection
                          </span>
                      </li>
                      <li class="feature-item">
                          <span class="feature-icon">💡</span>
                          <span class="feature-text">
                            <strong>Expert Tips:</strong> Learn from our AI-powered botanical knowledge base
                          </span>
                      </li>
                      <li class="feature-item">
                          <span class="feature-icon">🌱</span>
                          <span class="feature-text">
                            <strong>Community Support:</strong> Connect with fellow plant enthusiasts
                          </span>
                      </li>
                  </ul>
                  
                  <div class="cta-section">
                       <p><strong>Ready to start your plant care journey?</strong></p>
                       <a href="${clientUrl}" class="button">Start Chatting with Botani-Buddy!</a>
                  </div>
                  
                  <p>Happy planting,<br>The Botani-Buddy Team 🌱</p>
             </div>
             <div class="email-footer">
                  © ${new Date().getFullYear()} Botani-Buddy. All rights reserved.
                  <p>This is an automated message. For support, please contact us through our website.</p>
             </div>
        </div>
    </body>
    </html>`;

    return { subject, htmlBody, textBody };
};