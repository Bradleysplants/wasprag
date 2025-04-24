// trefleApi.js (ESM Version - CORRECTED AND COMPLETE)
// Path: ./src/utils/trefleApi.js (adjust path if needed)

// Use import syntax
import axios from 'axios';        // Default import for axios
import NodeCache from 'node-cache'; // Default import for node-cache

// --- Helper Functions (Reused) ---
// Keep the full implementation
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

// --- JSDoc Type Definitions ---
// (JSDoc definitions remain the same)
/** @typedef {Object} TrefleLinks ... */
/** @typedef {Object} TrefleMeta ... */
/** @typedef {Object} TrefleListResponse<T> ... */
/** @typedef {Object} TrefleDetailResponse<T> ... */
/** @typedef {Object} TreflePlantListItem ... */
/** @typedef {Object} TrefleGenus ... */
/** @typedef {Object} TrefleFamily ... */
/** @typedef {Object} TrefleImage ... */
/** @typedef {Object} TrefleImagesByType ... */
/** @typedef {Object} TreflePlantDetail ... */
/** @typedef {Object} TrefleSpecifications ... */
/** @typedef {Object} TrefleGrowthData ... */
/** @typedef {Object} FormattedPlantData ... */
/** @typedef {Object} RateLimiterState ... */
/** @typedef {Object} TrefleApiTools ... */

// --- Cache and Rate Limiter Setup ---
const cache = new NodeCache({
  stdTTL: safeParseInt(process.env.TREFLE_CACHE_TTL, 3600),
  checkperiod: 120
});

const rateLimiter = {
  maxRequests: safeParseInt(process.env.TREFLE_RATE_LIMIT_MAX, 120),
  timeWindow: safeParseInt(process.env.TREFLE_RATE_LIMIT_WINDOW, 3600),
  requestCount: 0,
  windowStart: Date.now()
};


// --- Trefle API Client Class ---
// Keep the full class implementation
class TrefleApiClient {
  baseUrl;
  apiKey;

  constructor() {
    this.baseUrl = process.env.TREFLE_API_BASE_URL ?? 'https://trefle.io/api/v1';
    this.apiKey = process.env.TREFLE_API_KEY;

    if (!this.apiKey) {
      console.warn('TREFLE_API_KEY is not set in config. Trefle API calls will likely fail.');
    }
  }

  _checkRateLimit() {
    const now = Date.now();
    const windowElapsed = (now - rateLimiter.windowStart) / 1000;

    if (windowElapsed >= rateLimiter.timeWindow) {
      rateLimiter.requestCount = 0;
      rateLimiter.windowStart = now;
      console.log('Rate limit window reset.');
      return;
    }

    if (rateLimiter.requestCount >= rateLimiter.maxRequests) {
      const waitTime = rateLimiter.timeWindow - windowElapsed;
      console.warn(`Rate limit exceeded. ${rateLimiter.requestCount}/${rateLimiter.maxRequests} requests.`);
      throw new Error(`Rate limit exceeded. Try again in ${Math.ceil(waitTime)} seconds.`);
    }
  }

  async _makeRequest(endpoint, params = {}) {
    if (!this.apiKey) {
        throw new Error("Trefle API Key is missing. Cannot make requests.");
    }

    const sortedParams = Object.keys(params).sort().reduce((obj, key) => {
        obj[key] = params[key];
        return obj;
    }, {});
    const cacheKey = `${endpoint}:${JSON.stringify(sortedParams)}`;

    const cachedData = cache.get(cacheKey);
    if (cachedData !== undefined) {
      console.log(`Cache hit for ${cacheKey}`);
      return cachedData;
    }
    console.log(`Cache miss for ${cacheKey}, checking rate limit...`);

    this._checkRateLimit();

    rateLimiter.requestCount++;
    console.log(`Making API request (${rateLimiter.requestCount}/${rateLimiter.maxRequests}) to ${endpoint}`);

    try {
      const requestConfig = {
        params: { ...params, token: this.apiKey }
      };
      const url = `${this.baseUrl}${endpoint}`;
      // Ensure axios is imported correctly
      const response = await axios.get(url, requestConfig);

      if (response.data) {
        cache.set(cacheKey, response.data);
        console.log(`Cached response for ${cacheKey}`);
      } else {
         console.warn(`No data received from ${endpoint}, not caching.`);
      }
      return response.data;

    } catch (error) {
      let shouldDecrement = true;
      console.error(`Trefle API error caught for ${endpoint}:`, error);

      // Ensure axios is imported correctly to use isAxiosError
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 429) {
          shouldDecrement = false;
          throw new Error('Trefle API rate limit hit (429). Try again later.');
        } else if (status === 404) {
          shouldDecrement = false;
          console.log(`Trefle API returned 404 (Not Found) for ${endpoint}`);
          cache.set(cacheKey, null);
          return null;
        } else {
          const apiErrorMessage = error.response?.data?.message || error.message;
          console.error(`Axios error ${status}: ${apiErrorMessage}`);
          throw new Error(`Trefle API request failed: ${apiErrorMessage} (Status: ${status ?? 'N/A'})`);
        }
      } else if (error instanceof Error) {
          if (error.message.startsWith('Rate limit exceeded')) {
              shouldDecrement = false;
          }
           throw error;
      } else {
         throw new Error(`An unexpected error occurred: ${String(error)}`);
      }

      if (shouldDecrement) {
           rateLimiter.requestCount--;
      }
    }
  }

  async searchPlants(query, page = 1, limit = 5) {
    return this._makeRequest('/plants/search', { q: query, page, limit });
  }

  async getPlantDetails(id) {
     return this._makeRequest(`/plants/${id}`);
  }

  async getPlantByScientificName(scientificName) {
    return this._makeRequest('/plants', { filter: { scientific_name: scientificName } });
  }

  async getPlantByCommonName(commonName) {
    return this._makeRequest('/plants', { filter: { common_name: commonName } });
  }

  async getPlantsByFamily(family, page = 1, limit = 10) {
    return this._makeRequest('/plants', { filter: { family_name: family }, page, limit });
  }

  async getPlantsByGrowthHabit(habit, page = 1, limit = 10) {
    return this._makeRequest('/plants', { filter: { growth_habit: habit }, page, limit });
  }

  async getPlantsByEdiblePart(ediblePart, page = 1, limit = 10) {
    return this._makeRequest('/plants', { filter: { edible_part: ediblePart }, page, limit });
  }

  async getPlantsBySoilNeeds(soilType, page = 1, limit = 10) {
    const soilMapping = { /* ... same mapping ... */ };
    const filterKey = soilType.toLowerCase();
    const filterParams = soilMapping[filterKey];
    if (!filterParams) {
      console.warn(`No specific soil filter mapping for "${soilType}". Returning empty results.`);
      return { data: [], meta: { total: 0 } };
    }
    return this._makeRequest('/plants', { filter: filterParams, page, limit });
  }

  formatPlantData(plantDetailResponse) {
    if (!plantDetailResponse?.data) { return null; }
    const data = plantDetailResponse.data;
    const mainSpecies = data.main_species ?? {};
    const growth = mainSpecies.growth ?? {};
    const specifications = mainSpecies.specifications ?? {};
    const images = data.images ?? {};
    const imageUrl = images.flower?.[0]?.image_url ?? /* ... rest of image checks ... */ data.image_url ?? null;

    const formatted = {
      id: data.id,
      name: data.common_name || data.scientific_name || `Plant ID ${data.id}`,
      scientificName: data.scientific_name,
      family: data.family_common_name || data.family?.name || null,
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
    return formatted;
  }

  _formatCareInfo(growth, specifications) {
    const care = [];
    if (specifications.growth_habit) care.push(`Habit: ${specifications.growth_habit}`);
    if (growth.light !== null && growth.light !== undefined) care.push(`Light: ${growth.light}/10`);
    if (growth.atmospheric_humidity !== null && growth.atmospheric_humidity !== undefined) care.push(`Atmospheric Humidity: ${growth.atmospheric_humidity}/10`);
    if (growth.minimum_precipitation?.mm !== null && growth.minimum_precipitation?.mm !== undefined) care.push(`Min Precipitation: ${growth.minimum_precipitation.mm} mm/year`);
    if (growth.maximum_precipitation?.mm !== null && growth.maximum_precipitation?.mm !== undefined) care.push(`Max Precipitation: ${growth.maximum_precipitation.mm} mm/year`);
    if (growth.minimum_temperature?.deg_c !== null && growth.minimum_temperature?.deg_c !== undefined) care.push(`Min Temp: ${growth.minimum_temperature.deg_c}°C`);
    if (growth.maximum_temperature?.deg_c !== null && growth.maximum_temperature?.deg_c !== undefined) care.push(`Max Temp: ${growth.maximum_temperature.deg_c}°C`);
    if (specifications.toxicity) care.push(`Toxicity: ${specifications.toxicity}`);
    return care.length > 0 ? care.join('\n') : 'Basic care information not specified.';
  }

  _formatSoilNeeds(growth) {
    const soil = [];
    if (growth.soil_texture !== null && growth.soil_texture !== undefined) soil.push(`Texture: ${growth.soil_texture}/10?`);
    if (growth.soil_nutriments !== null && growth.soil_nutriments !== undefined) soil.push(`Nutriments: ${growth.soil_nutriments}/10`);
    if (growth.soil_humidity !== null && growth.soil_humidity !== undefined) soil.push(`Humidity: ${growth.soil_humidity}/10`);
    const phMin = growth.ph_minimum;
    const phMax = growth.ph_maximum;
    if (phMin !== null && phMin !== undefined && phMax !== null && phMax !== undefined) { soil.push(`pH Range: ${phMin} - ${phMax}`); }
    else if (phMin !== null && phMin !== undefined) { soil.push(`Min pH: ${phMin}`); }
    else if (phMax !== null && phMax !== undefined) { soil.push(`Max pH: ${phMax}`); }
    if (growth.soil_salinity !== null && growth.soil_salinity !== undefined) soil.push(`Salinity Tolerance: ${growth.soil_salinity}/10`);
    return soil.length > 0 ? soil.join('\n') : 'Specific soil needs not detailed.';
  }
}


// --- Exports ---

// Export the singleton instance using export keyword
export const trefleApi = new TrefleApiClient();

// Export the tools object using export keyword
// Define it AFTER trefleApi is defined
export const trefleApiTools = {
  searchPlants: async (query) => {
    // Use the instance method
    const results = await trefleApi.searchPlants(query);
    return results?.data ?? [];
  },
  getPlantDetails: async (id) => {
    if (typeof id !== 'number') {
      console.error("trefleApiTools.getPlantDetails requires a numeric ID.");
      return null;
    }
    // Use the instance method
    const plantDetailsResponse = await trefleApi.getPlantDetails(id);
    // Use the instance method for formatting
    return trefleApi.formatPlantData(plantDetailsResponse);
  },
  getPlantByName: async (name) => {
    // Use the instance method
    let listResponse = await trefleApi.getPlantByCommonName(name);
    if (!listResponse?.data?.length) {
      // Use the instance method
      listResponse = await trefleApi.getPlantByScientificName(name);
    }
    if (!listResponse?.data?.length) {
       // Use the instance method
      listResponse = await trefleApi.searchPlants(name, 1, 1);
    }
    if (!listResponse?.data?.length) {
      console.log(`Tool getPlantByName: Could not find plant matching "${name}".`);
      return null;
    }
    const firstMatchId = listResponse.data[0]?.id;
    if (!firstMatchId) {
      console.error("Tool getPlantByName: Found match but it lacks ID:", listResponse.data[0]);
      return null;
    }
    // Call the other tool method correctly
    return trefleApiTools.getPlantDetails(firstMatchId);
  },
  getPlantsBySoil: async (soilType) => {
     // Use the instance method
    const listResponse = await trefleApi.getPlantsBySoilNeeds(soilType);
    if (!listResponse?.data) return [];
    const formattedResults = [];
    const detailLimit = 3;
    const plantsToProcess = listResponse.data.slice(0, detailLimit);
    for (const plant of plantsToProcess) {
      if (plant.id) {
         // Call the other tool method correctly
        const details = await trefleApiTools.getPlantDetails(plant.id);
        if (details) {
          formattedResults.push(details);
        }
      }
    }
    if (listResponse.data.length > detailLimit) {
        console.log(`Tool getPlantsBySoil: Returning details for ${detailLimit} of ${listResponse.meta?.total ?? listResponse.data.length} found plants matching "${soilType}".`);
    }
    return formattedResults;
  },
  getPlantsByFamily: async (family) => {
     // Use the instance method
    const listResponse = await trefleApi.getPlantsByFamily(family);
    return listResponse?.data ?? [];
  }
};

// --- REMOVED module.exports ---