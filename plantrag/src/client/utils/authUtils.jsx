// src/client/utils/authUtils.js
export const getUserDisplayNameFromUser = (user) => {
  if (!user) return 'User';

  if (user.identities?.username?.id) {
    return user.identities.username.id;
  }

  const providerId = user.getFirstProviderUserId();
  if (providerId) {
    return providerId;
  }

  return 'User';
};