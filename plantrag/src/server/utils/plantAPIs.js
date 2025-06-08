// src/server/utils/plantAPIs.js - Reliable free plant APIs
// Replaces unreliable Trefle API with better alternatives

/**
 * 🌟 BETTER PLANT API INTEGRATIONS 🌟
 * Using more reliable, completely free APIs
 */

/**
 * GBIF API - Global Biodiversity Information Facility (Completely Free!)
 * No API key required, massive database, very reliable
 * https://www.gbif.org/developer/summary
 */
export class GBIFAPI {
    constructor() {
        this.baseUrl = 'https://api.gbif.org/v1';
        this.cache = new Map();
    }
    
    async searchSpecies(query) {
        const cacheKey = `gbif_${query}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        
        try {
            const url = `${this.baseUrl}/species/search?q=${encodeURIComponent(query)}&rank=SPECIES&limit=10`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`GBIF API error: ${response.status}`);
            }
            
            const data = await response.json();
            const species = (data.results || []).map(result => ({
                id: result.key,
                scientificName: result.scientificName,
                commonName: result.vernacularName,
                kingdom: result.kingdom,
                family: result.family,
                genus: result.genus,
                confidence: 0.9,
                source: 'gbif'
            }));
            
            this.cache.set(cacheKey, species);
            return species;
            
        } catch (error) {
            console.error(`[GBIF] Search failed: ${error.message}`);
            return [];
        }
    }
    
    async getSpeciesDetails(speciesKey) {
        try {
            const url = `${this.baseUrl}/species/${speciesKey}`;
            const response = await fetch(url);
            
            if (!response.ok) return null;
            
            const species = await response.json();
            
            // Get vernacular names
            const vernacularUrl = `${this.baseUrl}/species/${speciesKey}/vernacularNames`;
            const vernacularResponse = await fetch(vernacularUrl);
            let commonNames = [];
            
            if (vernacularResponse.ok) {
                const vernacularData = await vernacularResponse.json();
                commonNames = vernacularData.results?.map(v => v.vernacularName) || [];
            }
            
            return {
                id: species.key,
                scientificName: species.scientificName,
                commonNames: commonNames,
                family: species.family,
                genus: species.genus,
                description: species.descriptions?.[0] || null,
                source: 'gbif'
            };
            
        } catch (error) {
            console.error(`[GBIF] Details failed: ${error.message}`);
            return null;
        }
    }
}

/**
 * iNaturalist API - Free, comprehensive, community-driven
 * No API key required, excellent plant database
 * https://www.inaturalist.org/pages/api+reference
 */
export class iNaturalistAPI {
    constructor() {
        this.baseUrl = 'https://api.inaturalist.org/v1';
        this.cache = new Map();
    }
    
    async searchTaxa(query) {
        const cacheKey = `inat_${query}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        
        try {
            const url = `${this.baseUrl}/taxa?q=${encodeURIComponent(query)}&rank=species,genus&iconic_taxa=Plantae&per_page=10`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`iNaturalist API error: ${response.status}`);
            }
            
            const data = await response.json();
            const taxa = (data.results || []).map(taxon => ({
                id: taxon.id,
                scientificName: taxon.name,
                commonName: taxon.preferred_common_name,
                allCommonNames: taxon.common_name ? [taxon.common_name.name] : [],
                rank: taxon.rank,
                family: taxon.ancestry ? this.extractFamily(taxon.ancestry) : null,
                observations: taxon.observations_count,
                confidence: taxon.observations_count > 100 ? 0.9 : 0.7,
                source: 'inaturalist',
                description: taxon.wikipedia_summary
            }));
            
            this.cache.set(cacheKey, taxa);
            return taxa;
            
        } catch (error) {
            console.error(`[iNaturalist] Search failed: ${error.message}`);
            return [];
        }
    }
    
    extractFamily(ancestry) {
        // Extract family from ancestry string (format: "48460/47126/211194/47125/47124")
        // This is a simplified approach - you might want to make it more robust
        return null; // Can be enhanced based on taxonomy hierarchy
    }
    
    async getTaxonDetails(taxonId) {
        try {
            const url = `${this.baseUrl}/taxa/${taxonId}`;
            const response = await fetch(url);
            
            if (!response.ok) return null;
            
            const data = await response.json();
            const taxon = data.results?.[0];
            
            if (!taxon) return null;
            
            return {
                id: taxon.id,
                scientificName: taxon.name,
                commonName: taxon.preferred_common_name,
                description: taxon.wikipedia_summary,
                observations: taxon.observations_count,
                source: 'inaturalist'
            };
            
        } catch (error) {
            console.error(`[iNaturalist] Details failed: ${error.message}`);
            return null;
        }
    }
}

/**
 * USDA Plants Database API - US native/naturalized plants
 * Completely free, no API key required
 * https://plantsdb.xyz/
 */
export class USDAPlantAPI {
    constructor() {
        this.baseUrl = 'https://plantsdb.xyz';
        this.cache = new Map();
    }
    
    async searchPlants(query) {
        const cacheKey = `usda_${query}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        
        try {
            const url = `${this.baseUrl}/search?name=${encodeURIComponent(query)}`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                if (response.status === 404) {
                    console.log(`[USDA] No results for "${query}" (404 normal)`);
                    return []; // 404 is normal, not an error
                } else if (response.status === 429) {
                    throw new Error('USDA rate limited');
                } else if (response.status === 401 || response.status === 403) {
                    throw new Error('USDA auth failed');
                }
                throw new Error(`USDA error: ${response.status}`);
            }
            
            const data = await response.json();
            const plants = (data.data || []).map(plant => ({
                id: plant.id,
                scientificName: plant.scientific_name,
                commonName: plant.common_name,
                family: plant.family,
                genus: plant.genus,
                symbol: plant.symbol, // USDA plant symbol
                confidence: 0.85,
                source: 'usda'
            }));
            
            this.cache.set(cacheKey, plants);
            return plants;
            
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('USDA API timeout (known issue)');
            } else if (error.message.includes('fetch failed')) {
                throw new Error('USDA API connection failed (known issue)');
            } else if (error.message.includes('ENOTFOUND')) {
                throw new Error('USDA API DNS failed');
            }
            throw new Error(`USDA API error: ${error.message}`);
        }
    }
    
    async getPlantDetails(plantSymbol) {
        try {
            const url = `${this.baseUrl}/plant/${plantSymbol}`;
            const response = await fetch(url);
            
            if (!response.ok) return null;
            
            const plant = await response.json();
            
            return {
                id: plant.data.id,
                symbol: plant.data.symbol,
                scientificName: plant.data.scientific_name,
                commonName: plant.data.common_name,
                family: plant.data.family,
                genus: plant.data.genus,
                nativeStatus: plant.data.native_status,
                growthHabit: plant.data.growth_habit,
                source: 'usda'
            };
            
        } catch (error) {
            console.error(`[USDA] Details failed: ${error.message}`);
            return null;
        }
    }
}

/**
 * Perenual API - Kept as fallback (requires free API key)
 * Free tier: 100 requests/day
 * https://perenual.com/docs/api
 */
export class PerenualAPI {
    constructor() {
        this.apiKey = process.env.PERENUAL_API_KEY;
        this.baseUrl = 'https://perenual.com/api';
        this.cache = new Map();
    }
    
    async searchPlants(query) {
        if (!this.apiKey) {
            console.warn('[Perenual] No API key configured');
            return [];
        }
        
        const cacheKey = `perenual_${query}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        
        try {
            const url = `${this.baseUrl}/species-list?key=${this.apiKey}&q=${encodeURIComponent(query)}&page=1`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                if (response.status === 404) {
                    console.log(`[PERENUAL] No results for "${query}" (404 normal)`);
                    return []; // 404 is normal, not an error
                } else if (response.status === 429) {
                    throw new Error('Perenual rate limited');
                } else if (response.status === 401 || response.status === 403) {
                    throw new Error('Perenual auth failed - check API key');
                }
                throw new Error(`Perenual error: ${response.status}`);
            }
            
            const data = await response.json();
            const plants = (data.data || []).map(plant => ({
                id: plant.id,
                commonName: plant.common_name,
                scientificName: plant.scientific_name?.[0],
                otherNames: plant.other_name || [],
                confidence: 0.95,
                source: 'perenual'
            }));
            
            this.cache.set(cacheKey, plants);
            return plants;
            
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Perenual API timeout');
            }
            throw new Error(`Perenual API error: ${error.message}`);
        }
    }
}

/**
 * 🌟 NEW UNIFIED PLANT API MANAGER 🌟
 * Uses multiple reliable, FREE APIs (no more Trefle!)
 */
export class ReliablePlantAPI {
    constructor() {
        this.gbif = new GBIFAPI();              // Completely free, no key needed
        this.inaturalist = new iNaturalistAPI(); // Completely free, no key needed  
        this.usda = new USDAPlantAPI();         // Completely free, no key needed
        this.perenual = new PerenualAPI();      // Free tier with key
    }
    
    async searchAllAPIs(query, maxWaitTime = 8000) {
        console.log(`[Reliable Plant API] Searching for: "${query}"`);
        
        const apiConfigs = [
            { name: 'GBIF', api: this.gbif, method: 'searchSpecies' },
            { name: 'INATURALIST', api: this.inaturalist, method: 'searchTaxa' },
            { name: 'USDA', api: this.usda, method: 'searchPlants' },
            { name: 'PERENUAL', api: this.perenual, method: 'searchPlants' }
        ];
        
        const searchPromises = apiConfigs.map(async (config) => {
            try {
                console.log(`[${config.name}] Starting search for "${query}"`);
                const results = await config.api[config.method](query);
                console.log(`[${config.name}] ✅ Found ${results?.length || 0} results`);
                return results || [];
            } catch (error) {
                const errorMsg = error.message || String(error);
                console.error(`[${config.name}] Failed: ${errorMsg}`);
                
                // Don't let individual API failures break everything
                if (config.name === 'USDA' || config.name === 'PERENUAL') {
                    console.log(`[${config.name}] Known unreliable API - continuing`);
                }
                
                return [];
            }
        });
        
        const timeoutPromise = new Promise(resolve => {
            setTimeout(() => resolve({ timeout: true }), maxWaitTime);
        });
        
        try {
            const results = await Promise.race([
                Promise.allSettled(searchPromises),
                timeoutPromise
            ]);
            
            if (results.timeout) {
                console.warn('[Reliable Plant API] Search timed out');
                return [];
            }
            
            const allPlants = [];
            const failedAPIs = [];
            
            results.forEach((result, index) => {
                const config = apiConfigs[index];
                
                if (result.status === 'fulfilled' && Array.isArray(result.value)) {
                    allPlants.push(...result.value);
                    console.log(`[${config.name}] ✅ Added ${result.value.length} results`);
                } else {
                    console.warn(`[${config.name}] ❌ Failed or invalid response`);
                    failedAPIs.push(config.name);
                }
            });
            
            const uniquePlants = this.deduplicateResults(allPlants);
            const rankedPlants = this.rankResults(uniquePlants, query);
            
            console.log(`[Reliable Plant API] ✅ Final: ${rankedPlants.length} unique results (${failedAPIs.length} APIs failed)`);
            return rankedPlants;
            
        } catch (error) {
            console.error(`[Reliable Plant API] Search failed: ${error.message}`);
            return [];
        }
    }
    
    deduplicateResults(plants) {
        const seen = new Set();
        const unique = [];
        
        plants.forEach(plant => {
            const key = (plant.scientificName || plant.commonName || '').toLowerCase();
            if (key && !seen.has(key)) {
                seen.add(key);
                unique.push(plant);
            }
        });
        
        return unique;
    }
    
    rankResults(plants, query) {
        const queryLower = query.toLowerCase();
        
        return plants
            .map(plant => {
                let relevanceScore = 0;
                
                // Exact matches get highest score
                if (plant.commonName?.toLowerCase() === queryLower) relevanceScore += 100;
                if (plant.scientificName?.toLowerCase() === queryLower) relevanceScore += 100;
                
                // Partial matches
                if (plant.commonName?.toLowerCase().includes(queryLower)) relevanceScore += 50;
                if (plant.scientificName?.toLowerCase().includes(queryLower)) relevanceScore += 50;
                
                // Word matches
                const queryWords = queryLower.split(' ');
                queryWords.forEach(word => {
                    if (plant.commonName?.toLowerCase().includes(word)) relevanceScore += 10;
                    if (plant.scientificName?.toLowerCase().includes(word)) relevanceScore += 10;
                });
                
                // Source reliability boost
                if (plant.source === 'gbif') relevanceScore += 10;         // Most reliable
                if (plant.source === 'inaturalist') relevanceScore += 8;   // Community verified
                if (plant.source === 'perenual') relevanceScore += 6;      // Commercial but good
                if (plant.source === 'usda') relevanceScore += 5;          // US-focused
                
                return { ...plant, relevanceScore };
            })
            .sort((a, b) => b.relevanceScore - a.relevanceScore)
            .slice(0, 10);
    }
    
    async validatePlantName(plantName) {
        const results = await this.searchAllAPIs(plantName, 5000);
        
        if (results.length === 0) {
            return {
                isValid: false,
                confidence: 0,
                plantName: plantName
            };
        }
        
        const bestMatch = results[0];
        return {
            isValid: true,
            confidence: bestMatch.confidence,
            validatedName: bestMatch.commonName || bestMatch.scientificName,
            scientificName: bestMatch.scientificName,
            source: bestMatch.source,
            relevanceScore: bestMatch.relevanceScore
        };
    }
}

// Create singleton instance
export const reliablePlantAPI = new ReliablePlantAPI();

/**
 * Updated plant name validation function
 */
export async function validatePlantNames(plantNames) {
    const validated = [];
    
    for (const plantName of plantNames.slice(0, 8)) { // Increased limit since APIs are more reliable
        try {
            const result = await reliablePlantAPI.validatePlantName(plantName);
            validated.push(result);
        } catch (error) {
            console.error(`[Plant Validation] Failed for "${plantName}": ${error.message}`);
            validated.push({
                isValid: false,
                confidence: 0,
                plantName: plantName,
                error: error.message
            });
        }
    }
    
    return validated;
}

/**
 * Health check for the new reliable APIs
 */
export async function reliablePlantAPIHealthCheck() {
    const results = {
        gbif: false,
        inaturalist: false,
        usda: false,
        perenual: false
    };
    
    const testQuery = 'hibiscus';
    
    // Test each API individually
    const api = new ReliablePlantAPI();
    
    try {
        const gbifResults = await api.gbif.searchSpecies(testQuery);
        results.gbif = gbifResults && gbifResults.length > 0;
    } catch (e) {
        console.warn(`GBIF test failed: ${e.message}`);
    }
    
    try {
        const inatResults = await api.inaturalist.searchTaxa(testQuery);
        results.inaturalist = inatResults && inatResults.length > 0;
    } catch (e) {
        console.warn(`iNaturalist test failed: ${e.message}`);
    }
    
    try {
        const usdaResults = await api.usda.searchPlants(testQuery);
        results.usda = usdaResults && usdaResults.length > 0;
    } catch (e) {
        console.warn(`USDA test failed: ${e.message}`);
    }
    
    try {
        const perenualResults = await api.perenual.searchPlants(testQuery);
        results.perenual = perenualResults && perenualResults.length > 0;
    } catch (e) {
        console.warn(`Perenual test failed: ${e.message}`);
    }
    
    const workingAPIs = Object.values(results).filter(Boolean).length;
    
    return {
        status: workingAPIs >= 2 ? 'healthy' : workingAPIs >= 1 ? 'degraded' : 'unhealthy',
        apis: results,
        workingCount: workingAPIs,
        totalCount: Object.keys(results).length,
        advantages: [
            'GBIF: Completely free, massive database, no API key needed',
            'iNaturalist: Community-verified, excellent coverage, no API key needed', 
            'USDA: Authoritative US plant data, no API key needed',
            'Perenual: Commercial quality, requires free API key'
        ]
    };
}