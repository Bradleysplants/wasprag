# Email Templates Directory

This directory contains all email templates for the Botani-Buddy application. Templates are organized as individual modules for better maintainability and reusability.

## Directory Structure

```
src/server/emailtemplates/
├── index.js                 # Central export hub
├── colors.js                # Shared color palette
├── passwordReset.js         # Password reset email
├── welcome.js               # Welcome email for new users
├── contactAutoResponse.js   # Contact form auto-response
├── adminNotification.js     # Admin notification for contact forms
└── README.md               # This file
```

## Usage

### Import Individual Templates

```javascript
import { generatePasswordResetEmail } from '../emailtemplates/passwordReset.js';
import { generateWelcomeEmail } from '../emailtemplates/welcome.js';
```

### Import All Templates

```javascript
import { 
  generatePasswordResetEmail,
  generateWelcomeEmail,
  generateContactAutoResponse,
  generateAdminNotificationEmail,
  emailColors 
} from '../emailtemplates/index.js';
```

## Template Functions

### `generatePasswordResetEmail(resetUrl, expirationMinutes?)`
- **Purpose**: Generate password reset email content
- **Parameters**: 
  - `resetUrl` (string): The password reset URL
  - `expirationMinutes` (number, optional): Token expiration time (default: 60)
- **Returns**: `{subject, htmlBody, textBody}`

### `generateWelcomeEmail(displayName, clientUrl)`
- **Purpose**: Generate welcome email for new users
- **Parameters**:
  - `displayName` (string): User's display name
  - `clientUrl` (string): Application URL
- **Returns**: `{subject, htmlBody, textBody}`

### `generateContactAutoResponse(customerName, ticketId, clientUrl?)`
- **Purpose**: Generate auto-response for contact form submissions
- **Parameters**:
  - `customerName` (string): Customer's name
  - `ticketId` (string): Support ticket ID
  - `clientUrl` (string, optional): Application URL
- **Returns**: `{subject, htmlBody, textBody}`

### `generateAdminNotificationEmail(formData, ticketId)`
- **Purpose**: Generate admin notification for contact submissions
- **Parameters**:
  - `formData` (object): Complete form submission data
  - `ticketId` (string): Support ticket ID
- **Returns**: `{subject, htmlBody, textBody}`

## Styling Guidelines

All templates use the shared color palette from `colors.js`:

- **Primary**: `#4CAF50` - Main brand green
- **Secondary**: `#7bb36b` - Lighter green accent
- **Accent**: `#4a7c59` - Dark green for CTAs
- **Background**: `#f9faf5` - Light green background
- **Text Dark**: `#333333` - Primary text color
- **Text Light**: `#666666` - Secondary text color

## Template Features

- **Responsive Design**: All templates work on mobile and desktop
- **Consistent Branding**: Unified Botani-Buddy theme with plant emojis
- **Accessibility**: Proper semantic HTML and color contrast
- **Fallback Text**: Plain text versions for all HTML emails
- **Professional Layout**: Clean, modern design suitable for business use

## Adding New Templates

1. Create a new `.js` file in this directory
2. Export a generation function following the naming pattern: `generate[TemplateName]Email`
3. Use the shared color palette from `colors.js`
4. Add the export to `index.js`
5. Update this README with usage documentation

## Email Client Compatibility

Templates are tested to work with:
- Gmail (Web, iOS, Android)
- Outlook (Web, Desktop, Mobile)
- Apple Mail (macOS, iOS)
- Yahoo Mail
- Thunderbird

## Environment Variables

Templates may reference these environment variables:
- `WASP_WEB_CLIENT_URL`: Base URL for the application
- `RESEND_DEFAULT_FROM_EMAIL`: Default sender email address

## Security Considerations

- Never include sensitive data in email templates
- Use HTTPS URLs for all links
- Implement proper token expiration for password resets
- Sanitize all user input before including in templates