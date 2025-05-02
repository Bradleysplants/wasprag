// src/server/utils/authUtils.js
// NOTE: This file runs ONLY on the server.

import { defineUserSignupFields } from 'wasp/server/auth';

// This object tells Wasp how to populate fields on your User entity
// during signup via the standard usernameAndPassword method.
export const userSignupFields = defineUserSignupFields({
  // The key 'email' matches the field name we added to the User entity
  email: (data) => {
    // 'data' contains the arguments passed to Wasp's internal signup.
    // For usernameAndPassword, the identifier is passed as 'username'.
    const identifier = data.username; // Wasp uses 'username' key internally

    // Perform validation expected for an email field
    if (!identifier || typeof identifier !== 'string' || !identifier.includes('@')) {
      // Throwing an error here will prevent signup and propagate to the client
      throw new Error('A valid email address is required for signup.');
    }

    // Optional: Add more complex email validation if needed

    // Return the validated identifier to be stored in the User.email field
    // Storing consistently lowercase is good practice for emails
    return identifier.toLowerCase();
  },

  // Example: Add other fields if you added them to your User entity
  // and passed them from a custom signup form
  // firstName: (data) => {
  //   const name = data.firstName?.trim(); // Assuming data comes from form
  //   if (name && name.length > 0) {
  //     return name;
  //   }
  //   return null; // Or handle as required/optional
  // },
});