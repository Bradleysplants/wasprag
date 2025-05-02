// src/server/actions/authActions.js

import { HttpError } from 'wasp/server';
import bcrypt from 'bcryptjs'; // Use bcryptjs consistently
// Import the Prisma client instance exported by Wasp as 'prisma' and rename it to 'db' locally
// Needed for the fallback logic to query Auth/AuthIdentity directly if email is not on User
import { prisma as db } from 'wasp/server';
// Import Prisma types for error checking if needed
import { Prisma } from '@prisma/client';
// Import Wasp auth helpers for updating password
import {
    createProviderId,
    findAuthIdentity,
    updateAuthIdentityProviderData
} from 'wasp/server/auth';

// --- JSDoc Type Definitions ---
/**
 * @typedef {Object} ResetPasswordArgs
 * @property {string} token - The reset token from the email link.
 * @property {string} newPassword - The new password entered by the user.
 */
/**
 * @typedef {Object} ResetPasswordResult
 * @property {boolean} success - Indicates if the reset was successful.
 * @property {string} message - User-facing message.
 */

// --- Constants ---
// SALT_ROUNDS is not strictly needed here as hashing is done by Wasp helper, but keep bcrypt import for token compare.

// --- Auth Actions ---

/**
 * Resets a user's password using a valid reset token and Wasp's auth helpers.
 * Includes fallback to query AuthIdentity if email is not populated on User entity.
 * @param {ResetPasswordArgs} args - Token and new password.
 * @param {object} context - Wasp context with context.entities.User.
 * @returns {Promise<ResetPasswordResult>} Result object.
 */
export const resetPassword = async (args, context) => {
    const { token, newPassword } = args;
    console.log(`Action: resetPassword called`);

    // 1. Input validation
    if (!token?.trim()) {
        throw new HttpError(400, "Invalid or missing password reset token.");
    }
    if (!newPassword || newPassword.length < 8) { // Basic password length check
        throw new HttpError(400, "New password must be at least 8 characters long.");
    }

    // 2. Verify User entity is available from context
    const UserEntity = context.entities?.User;
    if (!UserEntity) {
        console.error("Action: resetPassword - User entity not found on context. Ensure it's listed in main.wasp.");
        throw new HttpError(500, "Internal server configuration error (UserEntity missing).");
    }

    try {
        // 3. Find potential users with non-null, non-expired tokens using UserEntity from context
        // Select the email field to attempt direct identifier retrieval
        const potentialUsers = await UserEntity.findMany({
            where: {
                passwordResetToken: { not: null }, // Check token exists
                passwordResetTokenExpiresAt: { gt: new Date() } // Check expiry
            },
            select: { id: true, passwordResetToken: true, email: true } // Include email
        });

        if (!potentialUsers || potentialUsers.length === 0) {
             console.log("Action: resetPassword - No users found with potentially valid, non-expired tokens.");
             throw new HttpError(400, "Invalid or expired token.");
        }

        let userToUpdate = null;
        // 4. Iterate and securely compare the provided token with the stored hash
        for (const user of potentialUsers) {
             // Ensure passwordResetToken is not null before comparing
             if (user.passwordResetToken) {
                 // Compare the RAW token from args with the HASH from DB using bcryptjs
                 const isValid = await bcrypt.compare(token, user.passwordResetToken);
                 if (isValid) {
                     userToUpdate = user;
                     break; // Found the matching user
                 }
             }
        }

        // 5. Handle No Match Found
        if (!userToUpdate) {
            console.log("Action: resetPassword - Token did not match any stored hash for non-expired tokens.");
            throw new HttpError(400, "Invalid or expired token."); // Keep message generic
        }
        console.log(`Action: resetPassword - Valid token found for user ID: ${userToUpdate.id}`);

        // --- 6. Get User Identifier (Email/Username) ---
        let userIdentifier = userToUpdate.email; // Try getting identifier directly from User.email

        // --- FALLBACK: If email is NULL/empty on User entity, query AuthIdentity ---
        if (!userIdentifier) {
            console.warn(`Action: resetPassword - Email field is NULL/empty for user ID ${userToUpdate.id}. Querying AuthIdentity as fallback.`);
            try {
                // Use the imported 'db' (prisma client) for direct access
                const authRecord = await db.auth.findUnique({ where: { userId: userToUpdate.id }, select: { id: true } });
                if (!authRecord) { throw new Error("Auth record link missing."); } // Internal error if link broken

                const identityInfo = await db.authIdentity.findFirst({
                    where: { authId: authRecord.id, providerName: 'username' },
                    select: { providerUserId: true } // Get the identifier (email/username)
                });
                if (!identityInfo || !identityInfo.providerUserId) { throw new Error("ProviderUserId missing from AuthIdentity."); } // Internal error

                userIdentifier = identityInfo.providerUserId; // Get identifier from AuthIdentity
                console.log(`Action: resetPassword - Found providerUserId via fallback: ${userIdentifier}`);

            } catch (fallbackError) {
                 console.error(`Action: resetPassword - Failed to get identifier via AuthIdentity fallback for user ID ${userToUpdate.id}:`, fallbackError);
                 // Throw HttpError to client indicating config issue
                 throw new HttpError(500, "User data configuration error (cannot retrieve identifier).");
            }
        }
        // --- END FALLBACK ---

        // Final check if we obtained an identifier
         if (!userIdentifier) {
             // This case should ideally be prevented by the fallback's error throwing, but check just in case
             console.error(`Action: resetPassword - Could not determine user identifier for user ID ${userToUpdate.id}.`);
             throw new HttpError(500, "User data configuration error (identifier missing).");
        }
        console.log(`Action: resetPassword - Using identifier: ${userIdentifier}`);


        // --- 7. Update Password using Wasp Auth Helpers ---
        try {
            // 7a. Create the providerId string Wasp uses internally (e.g., "username:user@example.com")
            const providerId = createProviderId('username', userIdentifier);

            // 7b. Optional Check: Find AuthIdentity via helper to ensure consistency
            const authIdentity = await findAuthIdentity(providerId);
            if (!authIdentity) {
                // This would indicate a serious inconsistency between our lookup and Wasp's state
                console.error(`Action: resetPassword - Wasp's findAuthIdentity failed for providerId ${providerId} even after finding user. Data inconsistency?`);
                throw new HttpError(500, 'Authentication identity link missing or inconsistent.');
            }
            console.log(`Action: resetPassword - Found AuthIdentity via helper for ${providerId}.`);

            // 7c. Update the password using Wasp's helper function
            // This function handles hashing and storing in the correct JSON format internally.
            console.log(`Action: resetPassword - Calling updateAuthIdentityProviderData for ${providerId}`);
            await updateAuthIdentityProviderData(
                providerId,
                {}, // Pass empty object for existing data if ONLY updating password
                { hashedPassword: newPassword } // Pass the new PLAINTEXT password here
            );
            console.log(`Action: resetPassword - Password updated via Wasp helper for user ID: ${userToUpdate.id}`);

        } catch (updateError) {
           console.error(`Failed to update password via Wasp helpers for user ${userToUpdate.id}:`, updateError);
           if (updateError instanceof HttpError) throw updateError;
           // Check for specific Prisma errors if updateAuthIdentityProviderData uses Prisma internally and might fail
           if (updateError instanceof Prisma.PrismaClientKnownRequestError && updateError.code === 'P2025') {
                throw new HttpError(500, "Failed to find authentication record to update via helper.");
           }
           throw new HttpError(500, "Failed to update password.");
        }

        // 8. Clear the reset token fields from the User record (uses UserEntity from context)
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
            // Log error but don't fail the whole operation if password update succeeded
            console.error(`Action: resetPassword - Failed to clear reset token for user ID ${userToUpdate.id} after password update:`, clearTokenError);
        }

        // 9. Return Success
        return {
            success: true,
            message: "Password has been reset successfully."
        };

    } catch (error) { // Catch outer errors (from findMany, bcrypt.compare, or re-thrown HttpErrors)
        console.error("Error during password reset process:", error);
        if (error instanceof HttpError) {
            throw error; // Re-throw HttpErrors to the client
        }
        // Throw a generic error for unexpected issues
        throw new HttpError(500, "An unexpected error occurred while resetting the password.");
    }
};

// You could add other authentication-related actions here in the future if needed.