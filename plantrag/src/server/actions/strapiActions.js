import { HttpError } from 'wasp/server';
// Assuming global fetch is available (Node 18+). If not, you'd need to import node-fetch.
// const fetch = global.fetch || (await import('node-fetch')).default;


export const syncUserToStrapi = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'User not authenticated');
  }

  const waspUser = await context.entities.User.findUnique({
    where: { id: context.user.id },
    select: { id: true, email: true, firstName: true, lastName: true, theme: true },
  });

  if (!waspUser) {
    throw new HttpError(404, 'Wasp user not found');
  }

  const STRAPI_API_URL = process.env.STRAPI_API_URL || 'http://localhost:1337/api/app-users';
  const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN || null; // Set this in your .env.server if needed

  const headers = {
    'Content-Type': 'application/json',
  };
  if (STRAPI_API_TOKEN) {
    headers['Authorization'] = `Bearer ${STRAPI_API_TOKEN}`;
  }

  const strapiUserData = {
    wasspUserId: waspUser.id, // Ensure this field name matches your Strapi collection
    email: waspUser.email,
    firstName: waspUser.firstName,
    lastName: waspUser.lastName,
    theme: waspUser.theme,
    // Add any other fields you want to sync, ensuring they exist in your Strapi 'app-users' collection
  };

  try {
    // Check if user exists in Strapi by wasspUserId
    const findUrl = `${STRAPI_API_URL}?filters[wasspUserId][$eq]=${waspUser.id}`;
    console.log(`Finding user in Strapi: ${findUrl}`);
    const findResponse = await fetch(findUrl, { headers });
    
    // Strapi returns 200 OK with an empty data array if not found, or 200 OK with data if found.
    // Other statuses are actual errors.
    if (!findResponse.ok) { 
        const errorBody = await findResponse.text();
        console.error(`Strapi find error: ${findResponse.status}`, errorBody);
        throw new HttpError(500, `Strapi find request failed: ${findResponse.status} - ${errorBody}`);
    }
    
    const findResult = await findResponse.json();

    if (findResult.data && findResult.data.length > 0) {
      // User exists, update them
      const strapiEntryId = findResult.data[0].id;
      console.log(`User found in Strapi with entry ID: ${strapiEntryId}. Updating...`);
      const updateUrl = `${STRAPI_API_URL}/${strapiEntryId}`;
      const updateResponse = await fetch(updateUrl, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ data: strapiUserData }),
      });
      if (!updateResponse.ok) {
        const errorBody = await updateResponse.text();
        console.error(`Strapi update error: ${updateResponse.status}`, errorBody);
        throw new HttpError(500, `Strapi update request failed: ${updateResponse.status} - ${errorBody}`);
      }
      const updatedEntry = await updateResponse.json();
      console.log('User updated in Strapi:', updatedEntry.data.id);
      return { success: true, operation: 'updated', strapiId: updatedEntry.data.id, wasspUserId: waspUser.id };
    } else {
      // User does not exist, create them
      console.log('User not found in Strapi. Creating...');
      const createResponse = await fetch(STRAPI_API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ data: strapiUserData }),
      });
      if (!createResponse.ok) {
        const errorBody = await createResponse.text();
        console.error(`Strapi create error: ${createResponse.status}`, errorBody);
        throw new HttpError(500, `Strapi create request failed: ${createResponse.status} - ${errorBody}`);
      }
      const createdEntry = await createResponse.json();
      console.log('User created in Strapi:', createdEntry.data.id);
      return { success: true, operation: 'created', strapiId: createdEntry.data.id, wasspUserId: waspUser.id };
    }
  } catch (error) {
    console.error('Error syncing user to Strapi:', error);
    if (error instanceof HttpError) {
      throw error;
    }
    // Check if it's a fetch error (e.g. ECONNREFUSED)
    if (error.message && (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED'))) {
        throw new HttpError(503, `Could not connect to Strapi at ${STRAPI_API_URL}. Is Strapi running? Details: ${error.message}`);
    }
    throw new HttpError(500, `An unexpected error occurred during Strapi sync: ${error.message}`);
  }
};
