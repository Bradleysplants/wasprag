// src/server/jobs/strapiSync.js
import { syncUserToStrapi } from 'wasp/server/actions';
import { User } from '@wasp/entities';

export const syncAllUsers = async (args, context) => {
  const users = await context.entities.User.findMany({});
  for (const user of users) {
    try {
      await syncUserToStrapi({ userId: user.id });
    } catch (error) {
      console.error(`Error syncing user ${user.id} to Strapi:`, error);
    }
  }
};