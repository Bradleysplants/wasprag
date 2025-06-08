import { HttpError } from 'wasp/server';

export const updateUserTheme = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  const { theme } = args;
  if (!['light', 'dark'].includes(theme)) {
    throw new HttpError(400, "Invalid theme value. Allowed values are 'light' or 'dark'.");
  }

  return context.entities.User.update({
    where: { id: context.user.id },
    data: { theme: theme },
    select: { id: true, theme: true } // Optional: select what to return
  });
};

export const updateUserProfile = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  const { firstName, lastName } = args;

  // Basic validation: ensure firstName and lastName are strings if provided
  // Wasp/Prisma will handle if they are optional in the schema
  if (firstName !== undefined && typeof firstName !== 'string') {
    throw new HttpError(400, 'First name must be a string.');
  }
  if (lastName !== undefined && typeof lastName !== 'string') {
    throw new HttpError(400, 'Last name must be a string.');
  }
  
  // You could add more specific validation here (e.g., length)

  return context.entities.User.update({
    where: { id: context.user.id },
    data: { 
      firstName: firstName, // Pass undefined if you want to allow unsetting optional fields explicitly
      lastName: lastName    // Or filter out undefined keys from 'data' object before passing to Prisma
    },
    select: { id: true, email: true, firstName: true, lastName: true, theme: true } // Return updated user
  });
};
