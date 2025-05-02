// trefleApi.js (ESM Version - WITH RETRY LOGIC & SOIL MAPPING)
// Path: ./src/utils/trefleApi.js (adjust path if needed)

import axios from 'axios';
import NodeCache from 'node-cache';

// --- Helper Functions ---
function safeParseFloat(value, defaultValue) {
  if (value === undefined) return defaultValue;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

function safeParseInt(value, defaultValue) {
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

// Helper function for retry delay
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- JSDoc Type Definitions ---
/** @typedef {Object} TrefleLinks
 * @property {string} self
 * @property {string} [plant]
 * @property {string} [genus]
 * @property {string} [first]
 * @property {string} [next]
 * @property {string} [last]
 */
/** @typedef {Object} TrefleMeta
 * @property {number} total
 */
/** @typedef {Object} TrefleListResponse<T>
 * @property {T[]} data
 * @property {TrefleLinks} links
 * @property {TrefleMeta} meta
 */
/** @typedef {Object} TrefleDetailResponse<T>
 * @property {T} data
 * @property {TrefleLinks} links
 * @property {TrefleMeta} meta - Note: Meta might not be present on detail endpoints
 */
/** @typedef {Object} TreflePlantListItem
 * @property {number} id
 * @property {string} common_name
 * @property {string} slug
 * @property {string} scientific_name
 * @property {number} year
 * @property {string} bibliography
 * @property {string} author
 * @property {string} status
 * @property {string} rank
 * @property {string} family_common_name
 * @property {number} genus_id
 * @property {string} image_url
 * @property {string[]} synonyms
 * @property {string} genus
 * @property {string} family
 * @property {TrefleLinks} links
 */
/** @typedef {Object} TrefleGenus
 * @property {number} id
 * @property {string} name
 * @property {string} slug
 * @property {TrefleLinks} links
 */
/** @typedef {Object} TrefleFamily
 * @property {number} id
 * @property {string} name
 * @property {string} common_name
 * @property {string} slug
 * @property {TrefleLinks} links
 */
/** @typedef {Object} TrefleImage
 * @property {number} id
 * @property {string} image_url
 * @property {string} copyright
 */
/** @typedef {Object} TrefleImagesByType
 * @property {TrefleImage[]} [flower]
 * @property {TrefleImage[]} [leaf]
 * @property {TrefleImage[]} [bark]
 * @property {TrefleImage[]} [fruit]
 * @property {TrefleImage[]} [other]
 * @property {TrefleImage[]} [habitat]
 */
/** @typedef {Object} TreflePlantDetail
 * @property {number} id
 * @property {string} common_name
 * @property {string} slug
 * @property {string} scientific_name
 * @property {number} year
 * @property {string} bibliography
 * @property {string} author
 * @property {string} status
 * @property {string} rank
 * @property {string} family_common_name
 * @property {number} genus_id
 * @property {string} observations
 * @property {boolean} vegetable
 * @property {string} image_url
 * @property {string} genus
 * @property {string} family
 * @property {any} duration - Can be string[] or null
 * @property {any} edible_part - Can be string[] or null
 * @property {boolean} edible
 * @property {TrefleImagesByType} images
 * @property {TrefleGenus} genus_object - Renamed from 'genus' to avoid conflict
 * @property {TrefleFamily} family_object - Renamed from 'family' to avoid conflict
 * @property {string[]} synonyms
 * @property {TrefleGrowthData} main_species - Often contains detailed growth info
 * @property {any[]} sub_species
 * @property {any[]} varieties
 * @property {any[]} hybrids
 * @property {any[]} forms
 * @property {any[]} cultivars
 * @property {TrefleLinks} links
 * @property {object} sources
 */
/** @typedef {Object} TrefleSpecifications
 * @property {string} ligneous_type
 * @property {string} growth_form
 * @property {string} growth_habit
 * @property {string} growth_rate
 * @property {{cm: number | null}} average_height
 * @property {{cm: number | null}} maximum_height
 * @property {string} nitrogen_fixation
 * @property {string} shape_and_orientation
 * @property {string} toxicity
 */
/** @typedef {Object} TrefleGrowthData
 * @property {number} id
 * @property {string} slug
 * @property {string} scientific_name
 * @property {number} year
 * @property {string} bibliography
 * @property {string} author
 * @property {string} status
 * @property {string} rank
 * @property {string} family_common_name
 * @property {number} genus_id
 * @property {string} image_url
 * @property {string[]} synonyms
 * @property {string} genus
 * @property {string} family
 * @property {string} common_name
 * @property {{mm: number | null}} minimum_precipitation
 * @property {{mm: number | null}} maximum_precipitation
 * @property {number | null} minimum_root_depth_cm - Note: key might be slightly different, e.g., {cm: number | null}
 * @property {{deg_c: number | null}} minimum_temperature
 * @property {{deg_c: number | null}} maximum_temperature
 * @property {number | null} soil_nutriments - Scale?
 * @property {number | null} soil_salinity - Scale?
 * @property {number | null} soil_texture - Scale?
 * @property {number | null} soil_humidity - Scale?
 * @property {number | null} ph_minimum
 * @property {number | null} ph_maximum
 * @property {number | null} light - Scale?
 * @property {number | null} atmospheric_humidity - Scale?
 * @property {string[]} growth_months
 * @property {string[]} bloom_months
 * @property {string[]} fruit_months
 * @property {TrefleSpecifications} specifications
 * @property {TrefleGrowthData} growth - Seems recursive? Check API response structure
 * @property {TrefleLinks} links
 * @property {object} sources
 */
/** @typedef {Object} FormattedPlantData
 * @property {number} id
 * @property {string} name
 * @property {string | null} scientificName
 * @property {string | null} family
 * @property {string | null} description
 * @property {string} careInfo - Formatted care string
 * @property {string} soilNeeds - Formatted soil string
 * @property {object} growthInfo
 * @property {string | null} growthInfo.habit
 * @property {string | null} growthInfo.form
 * @property {string | null} growthInfo.rate
 * @property {number | null} growthInfo.light
 * @property {number | null} growthInfo.atmosphericHumidity
 * @property {number | null} growthInfo.minPrecipitationMm
 * @property {number | null} growthInfo.maxPrecipitationMm
 * @property {number | null} growthInfo.minTempC
 * @property {number | null} growthInfo.maxTempC
 * @property {string[] | null} growthInfo.growthMonths
 * @property {string[] | null} growthInfo.bloomMonths
 * @property {string[] | null} growthInfo.fruitMonths
 * @property {number | null} growthInfo.averageHeightCm
 * @property {number | null} growthInfo.maximumHeightCm
 * @property {string | null} image_url
 * @property {string} source
 */
/** @typedef {Object} RateLimiterState
 * @property {number} maxRequests
 * @property {number} timeWindow - seconds
 * @property {number} requestCount
 * @property {number} windowStart - timestamp (ms)
 */
/** @typedef {Object} TrefleApiTools
 * @property {(query: string) => Promise<TreflePlantListItem[]>} searchPlants
 * @property {(id: number) => Promise<FormattedPlantData | null>} getPlantDetails
 * @property {(name: string) => Promise<FormattedPlantData | null>} getPlantByName
 * @property {(soilType: string) => Promise<FormattedPlantData[]>} getPlantsBySoil
 * @property {(family: string) => Promise<TreflePlantListItem[]>} getPlantsByFamily
 */

// --- Cache and Rate Limiter Setup ---
const cache = new NodeCache({
  stdTTL: safeParseInt(process.env.TREFLE_CACHE_TTL, 3600), // Cache TTL in seconds (default 1 hour)
  checkperiod: 120 // How often to check for expired items (seconds)
});

/** @type {RateLimiterState} */
const rateLimiter = {
  maxRequests: safeParseInt(process.env.TREFLE_RATE_LIMIT_MAX, 120), // Max requests per window
  timeWindow: safeParseInt(process.env.TREFLE_RATE_LIMIT_WINDOW_SEC, 60), // Time window in seconds (default 1 min)
  requestCount: 0,
  windowStart: Date.now()
};


// --- Trefle API Client Class ---
class TrefleApiClient {
  baseUrl;
  apiKey;
  maxRetries;
  retryBaseDelay;

  // --- >>> ADDED SOIL MAPPING <<< ---
  // Note: Numeric ranges are assumptions based on common scales (0-10) or typical pH values.
  // Adjust these based on Trefle documentation or observed data if needed.
  soilMapping = {
    'sandy': { 'filter[soil_texture_lte]': 3, 'filter[soil_humidity_lte]': 4 },
    'clay': { 'filter[soil_texture_gte]': 7, 'filter[soil_humidity_gte]': 6 },
    'loam': { 'filter[soil_texture_gte]': 4, 'filter[soil_texture_lte]': 6, 'filter[soil_nutriments_gte]': 5 },
    'silt': { 'filter[soil_texture_gte]': 4, 'filter[soil_texture_lte]': 6 }, // Similar to loam but maybe less nutrient specific
    'chalky': { 'filter[ph_minimum_gte]': 7.5 }, // Alkaline
    'peaty': { 'filter[ph_maximum_lte]': 6.0 }, // Often Acidic
    'well-drained': { 'filter[soil_humidity_lte]': 4 },
    'moist': { 'filter[soil_humidity_gte]': 5 },
    'wet': { 'filter[soil_humidity_gte]': 8 },
    'acidic': { 'filter[ph_maximum_lte]': 6.5 },
    'neutral': { 'filter[ph_minimum_gte]': 6.6, 'filter[ph_maximum_lte]': 7.4 },
    'alkaline': { 'filter[ph_minimum_gte]': 7.5 },
    // Add more mappings as needed
  };

  constructor() {
    this.baseUrl = process.env.TREFLE_API_BASE_URL ?? 'https://trefle.io/api/v1';
    this.apiKey = process.env.TREFLE_API_KEY;
    this.maxRetries = safeParseInt(process.env.TREFLE_MAX_RETRIES, 3); // Default to 3 retries
    this.retryBaseDelay = safeParseInt(process.env.TREFLE_RETRY_DELAY_MS, 500); // Default base delay 500ms

    if (!this.apiKey) {
      console.warn('TREFLE_API_KEY environment variable is not set. Trefle API calls will likely fail.');
    }
     if (this.maxRetries > 0) {
        console.log(`Trefle API retry logic enabled: Max ${this.maxRetries} retries with base delay ${this.retryBaseDelay}ms.`);
    }
  }

  _checkRateLimit() {
    const now = Date.now();
    const windowElapsed = (now - rateLimiter.windowStart) / 1000; // seconds

    // Check if window has expired
    if (windowElapsed >= rateLimiter.timeWindow) {
      rateLimiter.requestCount = 0;
      rateLimiter.windowStart = now;
      console.log(`Rate limit window reset (Window: ${rateLimiter.timeWindow}s).`);
      // Continue, limit is reset
    }

    // Check if count exceeds max within the current window
    if (rateLimiter.requestCount >= rateLimiter.maxRequests) {
      const waitTime = rateLimiter.timeWindow - windowElapsed;
      const waitTimeMs = Math.max(0, Math.ceil(waitTime * 1000)); // Ensure non-negative wait time in ms
      console.warn(`Rate limit exceeded. ${rateLimiter.requestCount}/${rateLimiter.maxRequests} requests in window.`);
      // Throw an error indicating how long to wait
      throw new Error(`Rate limit exceeded. Try again in ${Math.ceil(waitTime)} seconds.`);
    }
    // If we reach here, the request is allowed within the rate limit.
  }

  async _makeRequest(endpoint, params = {}) {
    if (!this.apiKey) {
        throw new Error("Trefle API Key is missing. Cannot make requests.");
    }

    // Generate cache key based on sorted params for consistency
    const sortedParams = Object.keys(params).sort().reduce((obj, key) => {
        obj[key] = params[key];
        return obj;
    }, {});
    const cacheKey = `${endpoint}:${JSON.stringify(sortedParams)}`;

    // --- 1. Check Cache ---
    const cachedData = cache.get(cacheKey);
    if (cachedData !== undefined) {
      console.log(`Cache hit for ${cacheKey}`);
      return cachedData; // Return cached data (could be null if 404 was cached)
    }
    console.log(`Cache miss for ${cacheKey}`);

    // --- 2. Check Rate Limit (before attempting API call) ---
    this._checkRateLimit(); // Throws error if limit exceeded

    // --- 3. Increment Rate Limiter Count (only once per logical request) ---
    rateLimiter.requestCount++;
    let requestSuccessful = false; // Flag to track success for potential rate limit decrement on final failure
    console.log(`Making API request (${rateLimiter.requestCount}/${rateLimiter.maxRequests} in window) to ${endpoint}`);

    // --- 4. Attempt API call with Retries ---
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
        try {
            const requestConfig = {
                params: { ...params, token: this.apiKey }
            };
            const url = `${this.baseUrl}${endpoint}`;
            const response = await axios.get(url, requestConfig);

            // Success! Cache and return data.
            if (response.data) {
                cache.set(cacheKey, response.data);
                console.log(`Success (Attempt ${attempt+1}/${this.maxRetries+1}). Cached response for ${cacheKey}`);
            } else {
                console.warn(`No data received from ${endpoint} (Attempt ${attempt+1}/${this.maxRetries+1}), not caching.`);
                // Consider if null should be cached here too, depends on expected API behavior
            }
            requestSuccessful = true; // Mark as successful
            return response.data;

        } catch (error) {
            console.warn(`Attempt ${attempt + 1}/${this.maxRetries + 1} failed for ${endpoint}. Error: ${error.message}`);

            // --- Error Handling within Retry Loop ---
            const isAxiosError = axios.isAxiosError(error);
            const status = isAxiosError ? error.response?.status : null;
            const retryableStatuses = [500, 502, 503, 504]; // Common retryable server errors

            // --- a) Handle specific non-retryable errors ---
            if (status === 404) {
                console.log(`Trefle API returned 404 (Not Found) for ${endpoint}. Caching null.`);
                cache.set(cacheKey, null); // Cache null for 404s to avoid retrying non-existent resources
                requestSuccessful = true; // Treat 404 as "successful" in the sense that the request completed.
                return null; // Return null explicitly for 404
            }
            if (status === 429) {
                // We hit the server-side rate limit despite our check (maybe parallel requests or timing issue)
                console.error('Trefle API rate limit hit (429).');
                 // Decrement count because this request effectively failed *due to rate limiting*
                rateLimiter.requestCount--;
                throw new Error('Trefle API rate limit hit (429). Try again later.'); // Don't retry 429 automatically here
            }
             if (error.message.startsWith('Rate limit exceeded')) {
                // Error thrown by our own _checkRateLimit
                rateLimiter.requestCount--; // Decrement as the request didn't proceed
                 throw error; // Re-throw the specific rate limit error
            }

             // --- b) Check if error is retryable AND we have attempts left ---
            if (retryableStatuses.includes(status) && attempt < this.maxRetries) {
                const delay = this.retryBaseDelay * (2 ** attempt); // Exponential backoff
                console.log(`Retryable error (Status ${status}). Retrying in ${delay}ms...`);
                await sleep(delay);
                continue; // Go to the next iteration of the loop to retry
            }

            // --- c) If error is not retryable OR retries exhausted, throw final error ---
            console.error(`Final attempt failed or error non-retryable for ${endpoint}.`);
             let finalErrorMessage = `Trefle API request failed for ${endpoint}`;
            if (isAxiosError) {
                 const apiMsg = error.response?.data?.message || error.message;
                finalErrorMessage = `Trefle API request failed: ${apiMsg} (Status: ${status ?? 'N/A'})`;
             } else if (error instanceof Error) {
                 finalErrorMessage = error.message;
             } else {
                 finalErrorMessage = `An unexpected error occurred: ${String(error)}`;
             }
            // Decrement rate limit count ONLY IF the entire process failed terminally for a non-429/404 reason
            if (!requestSuccessful) {
                 rateLimiter.requestCount--;
             }
            throw new Error(finalErrorMessage); // Throw after loop finishes or for non-retryable errors
        }
    }
    // Should not be reached if loop logic is correct, but as a safeguard:
    throw new Error(`Trefle API request failed for ${endpoint} after ${this.maxRetries} retries.`);
  }


  // --- API Methods (remain largely the same, use _makeRequest) ---

  async searchPlants(query, page = 1, limit = 5) {
    return this._makeRequest('/plants/search', { q: query, page, limit });
  }

  async getPlantDetails(id) {
     // Ensure ID is passed correctly
     if (id === null || id === undefined) {
        console.error("getPlantDetails called with null or undefined ID.");
        return null; // Or throw error
     }
     return this._makeRequest(`/plants/${id}`);
  }

  async getPlantByScientificName(scientificName) {
    // Trefle uses filter[key]=value format
    return this._makeRequest('/plants', { 'filter[scientific_name]': scientificName });
  }

  async getPlantByCommonName(commonName) {
     return this._makeRequest('/plants', { 'filter[common_name]': commonName });
  }

  async getPlantsByFamily(family, page = 1, limit = 10) {
    return this._makeRequest('/plants', { 'filter[family_common_name]': family, page, limit }); // Assuming common name is better filter
  }

  async getPlantsByGrowthHabit(habit, page = 1, limit = 10) {
    // Assuming 'growth_habit' is a valid filter key
    return this._makeRequest('/plants', { 'filter[growth_habit]': habit, page, limit });
  }

  async getPlantsByEdiblePart(ediblePart, page = 1, limit = 10) {
    // Assuming 'edible_part' is a valid filter key
    return this._makeRequest('/plants', { 'filter[edible_part]': ediblePart, page, limit });
  }

  // --- >>> UPDATED getPlantsBySoilNeeds <<< ---
  async getPlantsBySoilNeeds(soilType, page = 1, limit = 10) {
    const filterKey = soilType?.toLowerCase().trim(); // Handle potential null/undefined input
    if (!filterKey) {
        console.warn(`getPlantsBySoilNeeds called with empty soilType.`);
        return { data: [], meta: { total: 0 } }; // Return empty result for invalid input
    }

    const filterParams = this.soilMapping[filterKey];

    if (!filterParams) {
      console.warn(`No specific soil filter mapping found for "${soilType}". Returning empty results.`);
      // Optionally, you could try a broad text search here as a fallback:
      // return this.searchPlants(`soil ${soilType}`, page, limit);
      return { data: [], meta: { total: 0 } }; // Default: return empty if no mapping
    }

    // Combine soil filters with pagination params
    const requestParams = { ...filterParams, page, limit };
    console.log(`Fetching plants for soil type "${soilType}" with filters:`, requestParams);
    return this._makeRequest('/plants', requestParams);
  }

  // --- Formatting Methods (remain the same) ---
  formatPlantData(plantDetailResponse) {
    // Check if the response itself or the data property is null/undefined
    if (!plantDetailResponse?.data) {
        // console.log("formatPlantData received null or invalid input:", plantDetailResponse);
        return null;
    }
    const data = plantDetailResponse.data;
    // Use default empty objects to avoid errors accessing nested properties if main_species is missing
    const mainSpecies = data.main_species ?? {};
    const growth = mainSpecies.growth ?? {};
    const specifications = mainSpecies.specifications ?? {};
    const images = data.images ?? {};

    // Prioritize specific image types, then fall back to main image_url
    const imageUrl = images.flower?.[0]?.image_url ??
                     images.leaf?.[0]?.image_url ??
                     images.fruit?.[0]?.image_url ??
                     images.bark?.[0]?.image_url ??
                     images.habitat?.[0]?.image_url ??
                     images.other?.[0]?.image_url ??
                     data.image_url ?? // Main image URL as last resort
                     null; // Default to null if no image found

    const formatted = {
      id: data.id,
      // Provide sensible fallbacks for name
      name: data.common_name?.trim() || data.scientific_name || `Plant ID ${data.id}`,
      scientificName: data.scientific_name || null,
      // Use optional chaining for family access
      family: data.family_common_name?.trim() || data.family?.name || null,
      // Combine observations and toxicity for a description, checking for null/undefined
      description: mainSpecies.observations ?? specifications.toxicity ?? null,
      careInfo: this._formatCareInfo(growth, specifications),
      soilNeeds: this._formatSoilNeeds(growth),
      growthInfo: {
        habit: specifications.growth_habit ?? null,
        form: specifications.growth_form ?? null,
        rate: specifications.growth_rate ?? null,
        light: growth.light ?? null,
        atmosphericHumidity: growth.atmospheric_humidity ?? null,
        minPrecipitationMm: growth.minimum_precipitation?.mm ?? null,
        maxPrecipitationMm: growth.maximum_precipitation?.mm ?? null,
        minTempC: growth.minimum_temperature?.deg_c ?? null,
        maxTempC: growth.maximum_temperature?.deg_c ?? null,
        growthMonths: growth.growth_months ?? null,
        bloomMonths: growth.bloom_months ?? null,
        fruitMonths: growth.fruit_months ?? null,
        averageHeightCm: specifications.average_height?.cm ?? null,
        maximumHeightCm: specifications.maximum_height?.cm ?? null,
      },
      image_url: imageUrl,
      source: `Trefle API (ID: ${data.id})`
    };
    // console.log(`Formatted data for ID ${data.id}:`, formatted);
    return formatted;
  }

  _formatCareInfo(growth, specifications) {
    const care = [];
    if (specifications.growth_habit) care.push(`Habit: ${specifications.growth_habit}`);
    // Explicitly check for null/undefined for numeric scales
    if (growth.light !== null && growth.light !== undefined) care.push(`Light: ${growth.light}/10`);
    if (growth.atmospheric_humidity !== null && growth.atmospheric_humidity !== undefined) care.push(`Atmospheric Humidity: ${growth.atmospheric_humidity}/10`);
    if (growth.minimum_precipitation?.mm !== null && growth.minimum_precipitation?.mm !== undefined) care.push(`Min Precipitation: ${growth.minimum_precipitation.mm} mm/year`);
    if (growth.maximum_precipitation?.mm !== null && growth.maximum_precipitation?.mm !== undefined) care.push(`Max Precipitation: ${growth.maximum_precipitation.mm} mm/year`);
    if (growth.minimum_temperature?.deg_c !== null && growth.minimum_temperature?.deg_c !== undefined) care.push(`Min Temp: ${growth.minimum_temperature.deg_c}°C`);
    if (growth.maximum_temperature?.deg_c !== null && growth.maximum_temperature?.deg_c !== undefined) care.push(`Max Temp: ${growth.maximum_temperature.deg_c}°C`);
    if (specifications.toxicity) care.push(`Toxicity: ${specifications.toxicity}`);
    // Add growth rate if available
    if (specifications.growth_rate) care.push(`Growth Rate: ${specifications.growth_rate}`);

    return care.length > 0 ? care.join('\n') : 'Basic care information not specified.';
  }

  _formatSoilNeeds(growth) {
    const soil = [];
    // Explicitly check for null/undefined for numeric scales
    if (growth.soil_texture !== null && growth.soil_texture !== undefined) soil.push(`Texture: ${growth.soil_texture}/10?`); // Meaning of scale unclear
    if (growth.soil_nutriments !== null && growth.soil_nutriments !== undefined) soil.push(`Nutriments: ${growth.soil_nutriments}/10`);
    if (growth.soil_humidity !== null && growth.soil_humidity !== undefined) soil.push(`Humidity: ${growth.soil_humidity}/10`);

    const phMin = growth.ph_minimum;
    const phMax = growth.ph_maximum;
    // Check both min and max are valid numbers before combining
    if (typeof phMin === 'number' && typeof phMax === 'number') {
        soil.push(`pH Range: ${phMin} - ${phMax}`);
    } else if (typeof phMin === 'number') {
        soil.push(`Min pH: ${phMin}`);
    } else if (typeof phMax === 'number') {
        soil.push(`Max pH: ${phMax}`);
    }

    if (growth.soil_salinity !== null && growth.soil_salinity !== undefined) soil.push(`Salinity Tolerance: ${growth.soil_salinity}/10`);

    return soil.length > 0 ? soil.join('\n') : 'Specific soil needs not detailed.';
  }
}


// --- Exports ---

// Export the singleton instance
export const trefleApi = new TrefleApiClient();

// Export the tools object, ensuring it uses the instance methods
export const trefleApiTools = {
  /** @type {TrefleApiTools['searchPlants']} */
  searchPlants: async (query) => {
    const results = await trefleApi.searchPlants(query);
    return results?.data ?? []; // Return empty array if data is missing
  },

  /** @type {TrefleApiTools['getPlantDetails']} */
  getPlantDetails: async (id) => {
    // Input validation
    if (typeof id !== 'number' || isNaN(id)) {
      console.error("trefleApiTools.getPlantDetails requires a valid numeric ID. Received:", id);
      return null;
    }
    const plantDetailsResponse = await trefleApi.getPlantDetails(id);
    return trefleApi.formatPlantData(plantDetailsResponse); // Format the result
  },

  /** @type {TrefleApiTools['getPlantByName']} */
  getPlantByName: async (name) => {
     if (!name || typeof name !== 'string' || !name.trim()) {
         console.warn("Tool getPlantByName called with invalid name.");
         return null;
     }
     const trimmedName = name.trim();
     let listResponse;

    // Try common name first
    console.log(`Tool getPlantByName: Searching common name "${trimmedName}"...`);
    listResponse = await trefleApi.getPlantByCommonName(trimmedName);

    // Try scientific name if common name fails
    if (!listResponse?.data?.length) {
        console.log(`Tool getPlantByName: Searching scientific name "${trimmedName}"...`);
        listResponse = await trefleApi.getPlantByScientificName(trimmedName);
    }

    // Try general search as a last resort if filtering fails
    if (!listResponse?.data?.length) {
        console.log(`Tool getPlantByName: Performing general search for "${trimmedName}"...`);
        listResponse = await trefleApi.searchPlants(trimmedName, 1, 1); // Search for top 1 result
    }

    // Process the result
    if (!listResponse?.data?.length) {
      console.log(`Tool getPlantByName: Could not find any plant matching "${trimmedName}".`);
      return null;
    }

    const firstMatchId = listResponse.data[0]?.id;
    if (typeof firstMatchId !== 'number') {
      console.error("Tool getPlantByName: Found match but it lacks a valid ID:", listResponse.data[0]);
      return null;
    }

    console.log(`Tool getPlantByName: Found match with ID ${firstMatchId}, fetching details...`);
    // Use the specific tool function to get formatted details
    return trefleApiTools.getPlantDetails(firstMatchId);
  },

  /** @type {TrefleApiTools['getPlantsBySoil']} */
  getPlantsBySoil: async (soilType) => {
    const listResponse = await trefleApi.getPlantsBySoilNeeds(soilType);
    if (!listResponse?.data?.length) {
        console.log(`Tool getPlantsBySoil: No plants found matching soil type "${soilType}" with current filters.`);
        return []; // Return empty array if no data
    }

    const formattedResults = [];
    const detailLimit = 3; // Limit details fetched to avoid excessive API calls
    // Use slice safely even if data length is less than limit
    const plantsToProcess = listResponse.data.slice(0, detailLimit);

    console.log(`Tool getPlantsBySoil: Processing details for up to ${detailLimit} plants found for "${soilType}"...`);
    // Use Promise.all for potentially faster parallel detail fetching
    const detailPromises = plantsToProcess.map(plant =>
        (typeof plant.id === 'number') ? trefleApiTools.getPlantDetails(plant.id) : Promise.resolve(null)
    );
    const detailedResults = await Promise.all(detailPromises);

    // Filter out null results (e.g., if getPlantDetails failed or ID was missing)
    const validDetails = detailedResults.filter(details => details !== null);
    formattedResults.push(...validDetails);

    if (listResponse.meta?.total > detailLimit) {
        console.log(`Tool getPlantsBySoil: Returning details for ${formattedResults.length} of ${listResponse.meta.total} total plants found matching "${soilType}".`);
    } else {
         console.log(`Tool getPlantsBySoil: Returning details for ${formattedResults.length} plants.`);
    }
    return formattedResults;
  },

   /** @type {TrefleApiTools['getPlantsByFamily']} */
  getPlantsByFamily: async (family) => {
     const listResponse = await trefleApi.getPlantsByFamily(family);
     return listResponse?.data ?? []; // Return empty array if data missing
  }
};

// --- REMOVED module.exports --- // Already using ESM export