// Enhanced resetPassword function for src/server/actions/authActions.js
// Replace your existing resetPassword function with this version

import { HttpError } from 'wasp/server';
import bcrypt from 'bcryptjs';
import { prisma as db } from 'wasp/server';
import { Prisma } from '@prisma/client';
import {
    createProviderId,
    findAuthIdentity,
    updateAuthIdentityProviderData
} from 'wasp/server/auth';

/**
 * @typedef {Object} ResetPasswordArgs
 * @property {string} [token] - The reset token from the email link (for forgot password flow).
 * @property {string} [currentPassword] - The current password (for account settings change).
 * @property {string} newPassword - The new password entered by the user.
 */
/**
 * @typedef {Object} ResetPasswordResult
 * @property {boolean} success - Indicates if the reset was successful.
 * @property {string} message - User-facing message.
 */

/**
 * Resets a user's password using either a valid reset token OR current password verification.
 * Supports both forgot password flow (token-based) and account settings flow (current password).
 * @param {ResetPasswordArgs} args - Token/currentPassword and new password.
 * @param {object} context - Wasp context with context.entities.User and context.user.
 * @returns {Promise<ResetPasswordResult>} Result object.
 */
export const resetPassword = async (args, context) => {
    // Debug logging - see exactly what we receive
    console.log('🔧 SERVER: resetPassword called');
    console.log('🔧 SERVER: Raw args:', JSON.stringify(args, null, 2));
    console.log('🔧 SERVER: typeof args:', typeof args);
    console.log('🔧 SERVER: Object.keys(args):', Object.keys(args || {}));
    
    const { token, currentPassword, newPassword } = args;
    
    // More detailed logging
    console.log('🔧 SERVER: Extracted values:');
    console.log('  - token:', token, typeof token);
    console.log('  - currentPassword:', currentPassword, typeof currentPassword);
    console.log('  - newPassword:', newPassword, typeof newPassword);

    // 1. Input validation
    if (!newPassword || newPassword.length < 8) {
        throw new HttpError(400, "New password must be at least 8 characters long.");
    }

    // Determine which flow we're using with better validation
    const hasToken = token && token.trim().length > 0;
    const hasCurrentPassword = currentPassword && currentPassword.trim().length > 0;

    console.log('🔧 SERVER: Flow detection:');
    console.log('  - hasToken:', hasToken);
    console.log('  - hasCurrentPassword:', hasCurrentPassword);

    if (!hasToken && !hasCurrentPassword) {
        throw new HttpError(400, "Either reset token or current password is required.");
    }

    if (hasToken && hasCurrentPassword) {
        throw new HttpError(400, "Cannot use both token and current password in the same request.");
    }

    const isTokenFlow = hasToken;
    const isCurrentPasswordFlow = hasCurrentPassword;

    console.log('🔧 SERVER: Using', isTokenFlow ? 'TOKEN' : 'CURRENT_PASSWORD', 'flow');

    // 2. Verify User entity is available from context
    const UserEntity = context.entities?.User;
    if (!UserEntity) {
        console.error("Action: resetPassword - User entity not found on context. Ensure it's listed in main.wasp.");
        throw new HttpError(500, "Internal server configuration error (UserEntity missing).");
    }

    try {
        let userToUpdate = null;
        let userIdentifier = null;

        // --- TOKEN-BASED RESET FLOW (existing functionality) ---
        if (isTokenFlow) {
            console.log('🔧 SERVER: Processing TOKEN flow');
            
            // Find potential users with non-null, non-expired tokens
            const potentialUsers = await UserEntity.findMany({
                where: {
                    passwordResetToken: { not: null },
                    passwordResetTokenExpiresAt: { gt: new Date() }
                },
                select: { id: true, passwordResetToken: true, email: true }
            });

            if (!potentialUsers || potentialUsers.length === 0) {
                console.log("Action: resetPassword - No users found with potentially valid, non-expired tokens.");
                throw new HttpError(400, "Invalid or expired token.");
            }

            // Find matching token
            for (const user of potentialUsers) {
                if (user.passwordResetToken) {
                    const isValid = await bcrypt.compare(token, user.passwordResetToken);
                    if (isValid) {
                        userToUpdate = user;
                        break;
                    }
                }
            }

            if (!userToUpdate) {
                console.log("Action: resetPassword - Token did not match any stored hash for non-expired tokens.");
                throw new HttpError(400, "Invalid or expired token.");
            }

            console.log(`Action: resetPassword - Valid token found for user ID: ${userToUpdate.id}`);

            // Get user identifier (email/username)
            userIdentifier = userToUpdate.email;

            // Fallback: If email is NULL/empty on User entity, query AuthIdentity
            if (!userIdentifier) {
                console.warn(`Action: resetPassword - Email field is NULL/empty for user ID ${userToUpdate.id}. Querying AuthIdentity as fallback.`);
                try {
                    const authRecord = await db.auth.findUnique({ 
                        where: { userId: userToUpdate.id }, 
                        select: { id: true } 
                    });
                    if (!authRecord) { 
                        throw new Error("Auth record link missing."); 
                    }

                    const identityInfo = await db.authIdentity.findFirst({
                        where: { authId: authRecord.id, providerName: 'username' },
                        select: { providerUserId: true }
                    });
                    if (!identityInfo || !identityInfo.providerUserId) { 
                        throw new Error("ProviderUserId missing from AuthIdentity."); 
                    }

                    userIdentifier = identityInfo.providerUserId;
                    console.log(`Action: resetPassword - Found providerUserId via fallback: ${userIdentifier}`);

                } catch (fallbackError) {
                    console.error(`Action: resetPassword - Failed to get identifier via AuthIdentity fallback for user ID ${userToUpdate.id}:`, fallbackError);
                    throw new HttpError(500, "User data configuration error (cannot retrieve identifier).");
                }
            }

            if (!userIdentifier) {
                console.error(`Action: resetPassword - Could not determine user identifier for user ID ${userToUpdate.id}.`);
                throw new HttpError(500, "User data configuration error (identifier missing).");
            }
        }

        // --- CURRENT PASSWORD FLOW (new functionality for account settings) ---
        if (isCurrentPasswordFlow) {
            console.log('🔧 SERVER: Processing CURRENT_PASSWORD flow');
            
            if (!context.user) {
                throw new HttpError(401, 'User not authenticated');
            }

            // Get the authenticated user
            const authenticatedUser = await UserEntity.findUnique({
                where: { id: context.user.id },
                select: { id: true, email: true }
            });

            if (!authenticatedUser) {
                throw new HttpError(404, "User not found.");
            }

            userToUpdate = authenticatedUser;
            userIdentifier = authenticatedUser.email;

            // If no email on User, use fallback to get identifier
            if (!userIdentifier) {
                console.warn(`Action: resetPassword - Email field is NULL/empty for authenticated user ID ${userToUpdate.id}. Querying AuthIdentity as fallback.`);
                try {
                    const authRecord = await db.auth.findUnique({ 
                        where: { userId: userToUpdate.id }, 
                        select: { id: true } 
                    });
                    if (!authRecord) { 
                        throw new Error("Auth record link missing."); 
                    }

                    const identityInfo = await db.authIdentity.findFirst({
                        where: { authId: authRecord.id, providerName: 'username' },
                        select: { providerUserId: true }
                    });
                    if (!identityInfo || !identityInfo.providerUserId) { 
                        throw new Error("ProviderUserId missing from AuthIdentity."); 
                    }

                    userIdentifier = identityInfo.providerUserId;
                    console.log(`Action: resetPassword - Found providerUserId via fallback: ${userIdentifier}`);

                } catch (fallbackError) {
                    console.error(`Action: resetPassword - Failed to get identifier via AuthIdentity fallback for user ID ${userToUpdate.id}:`, fallbackError);
                    throw new HttpError(500, "User data configuration error (cannot retrieve identifier).");
                }
            }

            if (!userIdentifier) {
                console.error(`Action: resetPassword - Could not determine user identifier for authenticated user ID ${userToUpdate.id}.`);
                throw new HttpError(500, "User data configuration error (identifier missing).");
            }

            // Verify current password by checking against AuthIdentity
            try {
                const providerId = createProviderId('username', userIdentifier);
                const authIdentity = await findAuthIdentity(providerId);
                
                if (!authIdentity) {
                    console.error(`Action: resetPassword - No AuthIdentity found for providerId ${providerId}`);
                    throw new HttpError(500, 'Authentication identity not found.');
                }

                // Get current password hash from AuthIdentity providerData
                const providerData = authIdentity.providerData ? JSON.parse(authIdentity.providerData) : {};
                const currentHashedPassword = providerData.hashedPassword;

                if (!currentHashedPassword) {
                    console.error(`Action: resetPassword - No hashed password found in providerData for user ${userToUpdate.id}`);
                    throw new HttpError(500, 'Current password verification failed.');
                }

                // Verify current password
                const isCurrentPasswordValid = await bcrypt.compare(currentPassword, currentHashedPassword);
                if (!isCurrentPasswordValid) {
                    throw new HttpError(400, 'Current password is incorrect');
                }

                console.log(`Action: resetPassword - Current password verified for user ID: ${userToUpdate.id}`);

            } catch (verifyError) {
                if (verifyError instanceof HttpError) {
                    throw verifyError;
                }
                console.error(`Action: resetPassword - Error verifying current password for user ${userToUpdate.id}:`, verifyError);
                throw new HttpError(500, 'Current password verification failed.');
            }
        }

        console.log(`Action: resetPassword - Using identifier: ${userIdentifier}`);

        // --- Update Password using Wasp Auth Helpers (common for both flows) ---
        try {
            const providerId = createProviderId('username', userIdentifier);

            // Find AuthIdentity via helper to ensure consistency
            const authIdentity = await findAuthIdentity(providerId);
            if (!authIdentity) {
                console.error(`Action: resetPassword - Wasp's findAuthIdentity failed for providerId ${providerId}`);
                throw new HttpError(500, 'Authentication identity link missing or inconsistent.');
            }
            console.log(`Action: resetPassword - Found AuthIdentity via helper for ${providerId}.`);

            // Update the password using Wasp's helper function
            console.log(`Action: resetPassword - Calling updateAuthIdentityProviderData for ${providerId}`);
            await updateAuthIdentityProviderData(
                providerId,
                {},
                { hashedPassword: newPassword }
            );
            console.log(`Action: resetPassword - Password updated via Wasp helper for user ID: ${userToUpdate.id}`);

        } catch (updateError) {
            console.error(`Failed to update password via Wasp helpers for user ${userToUpdate.id}:`, updateError);
            if (updateError instanceof HttpError) throw updateError;
            if (updateError instanceof Prisma.PrismaClientKnownRequestError && updateError.code === 'P2025') {
                throw new HttpError(500, "Failed to find authentication record to update via helper.");
            }
            throw new HttpError(500, "Failed to update password.");
        }

        // Clear reset token fields only for token-based flow
        if (isTokenFlow) {
            try {
                await UserEntity.update({
                    where: { id: userToUpdate.id },
                    data: {
                        passwordResetToken: null,
                        passwordResetTokenExpiresAt: null
                    }
                });
                console.log(`Action: resetPassword - Reset token cleared for user ID: ${userToUpdate.id}`);
            } catch (clearTokenError) {
                console.error(`Action: resetPassword - Failed to clear reset token for user ID ${userToUpdate.id} after password update:`, clearTokenError);
            }
        }

        // Return success message based on flow
        const successMessage = isTokenFlow 
            ? "Password has been reset successfully." 
            : "Password changed successfully.";

        return {
            success: true,
            message: successMessage
        };

    } catch (error) {
        console.error("Error during password reset/change process:", error);
        if (error instanceof HttpError) {
            throw error;
        }
        throw new HttpError(500, "An unexpected error occurred while processing the password request.");
    }
};