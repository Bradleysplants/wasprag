// src/server/queries/messages.js
export const getUserMessages = async ({ limit = 100 }, context) => {
  if (!context.user) throw new Error('User not authenticated');
  
  return context.entities.Message.findMany({
    where: {
      userId: context.user.id
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: limit
  });
};