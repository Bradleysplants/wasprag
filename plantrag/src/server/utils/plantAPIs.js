// src/server/utils/plantAPIs.js - Enhanced with care endpoints
// Comprehensive plant API integration with care information

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
 * Enhanced Perenual API with Care Endpoints
 * Free tier: 100 requests/day, includes comprehensive care data
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
    
    /**
     * Get detailed species information with care data
     */
    async getSpeciesDetails(speciesId) {
        if (!this.apiKey) {
            console.warn('[Perenual] No API key configured');
            return null;
        }
        
        try {
            const url = `${this.baseUrl}/species/details/${speciesId}?key=${this.apiKey}`;
            const response = await fetch(url);
            
            if (!response.ok) return null;
            
            const data = await response.json();
            
            return {
                id: data.id,
                commonName: data.common_name,
                scientificName: data.scientific_name?.[0],
                family: data.family,
                // Care information fields
                watering: data.watering,
                watering_general_benchmark: data.watering_general_benchmark,
                sunlight: Array.isArray(data.sunlight) ? data.sunlight.join(', ') : data.sunlight,
                soil: data.soil,
                fertilizer: data.fertilizer,
                hardiness: data.hardiness,
                maintenance: data.maintenance,
                growth_rate: data.growth_rate,
                drought_tolerant: data.drought_tolerant,
                salt_tolerant: data.salt_tolerant,
                thorny: data.thorny,
                invasive: data.invasive,
                tropical: data.tropical,
                indoor: data.indoor,
                care_level: data.care_level,
                pest_susceptibility: data.pest_susceptibility,
                flowers: data.flowers,
                flowering_season: data.flowering_season,
                flower_color: data.flower_color,
                cones: data.cones,
                fruits: data.fruits,
                edible_fruit: data.edible_fruit,
                leaf: data.leaf,
                leaf_color: data.leaf_color,
                edible_leaf: data.edible_leaf,
                cuisine: data.cuisine,
                medicinal: data.medicinal,
                poisonous_to_humans: data.poisonous_to_humans,
                poisonous_to_pets: data.poisonous_to_pets,
                description: data.description,
                dimensions: data.dimensions,
                attracts: data.attracts,
                propagation: data.propagation,
                pruning_month: data.pruning_month,
                pruning_count: data.pruning_count,
                source: 'perenual'
            };
            
        } catch (error) {
            console.error(`[Perenual] Details failed: ${error.message}`);
            return null;
        }
    }
    
    /**
     * Get comprehensive care guide for a species
     */
    async getCareGuide(speciesId) {
        if (!this.apiKey) {
            console.warn('[Perenual] No API key configured');
            return null;
        }
        
        try {
            const url = `${this.baseUrl}/species-care-guide?species_id=${speciesId}&key=${this.apiKey}`;
            const response = await fetch(url);
            
            if (!response.ok) return null;
            
            const data = await response.json();
            
            return {
                speciesId: speciesId,
                careGuide: data.section?.map(section => ({
                    type: section.type, // sunlight, watering, pruning, etc.
                    description: section.description
                })) || [],
                source: 'perenual_care'
            };
            
        } catch (error) {
            console.error(`[Perenual Care] Failed: ${error.message}`);
            return null;
        }
    }
    
    /**
     * Enhanced species search with care information
     */
    async searchPlantsWithCare(query) {
        const basicResults = await this.searchPlants(query);
        
        // Enhance with care data for top results
        const enhancedResults = await Promise.all(
            basicResults.slice(0, 3).map(async (plant) => {
                try {
                    const details = await this.getSpeciesDetails(plant.id);
                    
                    if (details) {
                        return {
                            ...plant,
                            ...details,
                            // Ensure we have the original data
                            confidence: plant.confidence,
                            source: plant.source
                        };
                    }
                    
                    return plant;
                } catch (error) {
                    console.warn(`[Perenual Care] Details failed for ${plant.id}: ${error.message}`);
                    return plant;
                }
            })
        );
        
        return enhancedResults;
    }
}

/**
 * Plant Care Information API (Zyla API Hub)
 * Provides detailed care instructions for common plants
 */
export class PlantCareAPI {
    constructor() {
        this.apiKey = process.env.ZYLA_API_KEY;
        this.baseUrl = 'https://zylalabs.com/api/2162/plant+care+information+api/1962';
        this.cache = new Map();
    }
    
    async getPlantCareInfo(plantType) {
        if (!this.apiKey) {
            console.warn('[Plant Care API] No API key configured - skipping');
            return null;
        }
        
        const cacheKey = `care_${plantType}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        
        try {
            const url = `${this.baseUrl}/get+plants+information?plant_type=${encodeURIComponent(plantType)}`;
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                }
            });
            
            if (!response.ok) return null;
            
            const data = await response.json();
            
            const careInfo = {
                plantType: data.plant_type,
                watering: data.plant_care_info?.watering,
                light: data.plant_care_info?.light,
                temperature: data.plant_care_info?.temperature,
                humidity: data.plant_care_info?.humidity,
                soil: data.plant_care_info?.soil,
                fertilizers: data.plant_care_info?.fertilizers,
                diseases: data.plant_care_info?.diseases,
                propagation: data.plant_care_info?.propagation,
                seasonalCare: data.plant_care_info?.seasonal_care,
                growth: data.plant_care_info?.growth,
                source: 'plant_care_api'
            };
            
            this.cache.set(cacheKey, careInfo);
            return careInfo;
            
        } catch (error) {
            console.error(`[Plant Care API] Failed: ${error.message}`);
            return null;
        }
    }
}

/**
 * APIFarmer Plant Database API
 * Comprehensive database with growth requirements
 */
export class APIFarmerAPI {
    constructor() {
        this.apiKey = process.env.APIFARMER_API_KEY;
        this.baseUrl = 'https://apifarmer.com/api/v1';
        this.cache = new Map();
    }
    
    async searchPlants(query) {
        if (!this.apiKey) {
            console.warn('[APIFarmer] No API key configured - skipping');
            return [];
        }
        
        try {
            const url = `${this.baseUrl}/plants/search?query=${encodeURIComponent(query)}&api_key=${this.apiKey}`;
            const response = await fetch(url);
            
            if (!response.ok) return [];
            
            const data = await response.json();
            
            return (data.plants || []).map(plant => ({
                id: plant.id,
                commonName: plant.common_name,
                scientificName: plant.scientific_name,
                family: plant.family,
                genus: plant.genus,
                // Care-specific fields
                growthForm: plant.growth_form,
                growthRate: plant.growth_rate,
                height: plant.height,
                lifespan: plant.lifespan,
                fertilityRequirement: plant.fertility_requirement,
                droughtTolerance: plant.drought_tolerance,
                minPH: plant.min_ph,
                maxPH: plant.max_ph,
                minPrecipitation: plant.min_precipitation,
                maxPrecipitation: plant.max_precipitation,
                minTemperature: plant.min_temperature,
                maxTemperature: plant.max_temperature,
                soilAdaptability: plant.soil_adaptability,
                activeGrowthPeriod: plant.active_growth_period,
                leafRetention: plant.leaf_retention,
                source: 'apifarmer'
            }));
            
        } catch (error) {
            console.error(`[APIFarmer] Search failed: ${error.message}`);
            return [];
        }
    }
}

/**
 * Permapeople.org API (Sustainable/Edible Plants)
 * Free API for sustainable gardening and permaculture
 */
export class PermapeopleAPI {
    constructor() {
        this.baseUrl = 'https://permapeople.org/api/v1';
        this.cache = new Map();
    }
    
    async searchPlants(query) {
        try {
            const url = `${this.baseUrl}/plants/search`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ q: query })
            });
            
            if (!response.ok) return [];
            
            const data = await response.json();
            
            return (data.plants || []).map(plant => ({
                id: plant.id,
                scientificName: plant.scientific_name,
                commonName: plant.name,
                family: this.extractDataValue(plant.data, 'Family'),
                description: plant.description,
                // Care information from data array
                waterRequirement: this.extractDataValue(plant.data, 'Water requirement'),
                lightRequirement: this.extractDataValue(plant.data, 'Light requirement'),
                soilType: this.extractDataValue(plant.data, 'Soil type'),
                hardinessZone: this.extractDataValue(plant.data, 'USDA Hardiness zone'),
                growth: this.extractDataValue(plant.data, 'Growth'),
                layer: this.extractDataValue(plant.data, 'Layer'),
                edible: this.extractDataValue(plant.data, 'Edible') === 'true',
                edibleParts: this.extractDataValue(plant.data, 'Edible parts'),
                source: 'permapeople'
            }));
            
        } catch (error) {
            console.error(`[Permapeople] Search failed: ${error.message}`);
            return [];
        }
    }
    
    extractDataValue(dataArray, key) {
        return dataArray?.find(d => d.key === key)?.value || null;
    }
}

/**
 * Enhanced ReliablePlantAPI with Care Integration
 * Combines all APIs for comprehensive plant identification and care data
 */
export class ReliablePlantAPI {
    constructor() {
        this.gbif = new GBIFAPI();              // Completely free, no key needed
        this.inaturalist = new iNaturalistAPI(); // Completely free, no key needed  
        this.usda = new USDAPlantAPI();         // Completely free, no key needed
        this.perenual = new PerenualAPI();      // Free tier with key - HAS CARE DATA
        
        // Additional care-specific APIs (optional)
        this.plantCareAPI = new PlantCareAPI();  // Requires paid key
        this.apiFarmer = new APIFarmerAPI();     // Requires paid key
        this.permapeople = new PermapeopleAPI(); // Free, no key needed
    }
    
    async searchAllAPIs(query, maxWaitTime = 12000) {
        console.log(`[Reliable Plant API] Searching for: "${query}" with care information`);
        
        const apiConfigs = [
            { name: 'GBIF', api: this.gbif, method: 'searchSpecies' },
            { name: 'INATURALIST', api: this.inaturalist, method: 'searchTaxa' },
            { name: 'USDA', api: this.usda, method: 'searchPlants' },
            { name: 'PERENUAL', api: this.perenual, method: 'searchPlantsWithCare' },
            { name: 'PERMAPEOPLE', api: this.permapeople, method: 'searchPlants' },
            { name: 'APIFARMER', api: this.apiFarmer, method: 'searchPlants' }
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
                if (config.name === 'USDA' || config.name === 'PERENUAL' || config.name === 'APIFARMER') {
                    console.log(`[${config.name}] Known potentially unreliable API - continuing`);
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
            
            // Enhance results with additional care data
            const enhancedPlants = await this.enhanceWithCareData(allPlants, query);
            
            const uniquePlants = this.deduplicateResults(enhancedPlants);
            const rankedPlants = this.rankResults(uniquePlants, query);
            
            console.log(`[Reliable Plant API] ✅ Final: ${rankedPlants.length} unique results (${failedAPIs.length} APIs failed)`);
            return rankedPlants;
            
        } catch (error) {
            console.error(`[Reliable Plant API] Search failed: ${error.message}`);
            return [];
        }
    }
    
    /**
     * Enhance plant results with additional care data
     */
    async enhanceWithCareData(plants, originalQuery) {
        console.log(`[Care Enhancement] Enhancing ${plants.length} plants with care data`);
        
        return await Promise.all(
            plants.map(async (plant) => {
                try {
                    // Try to get additional care info from Plant Care API if available
                    let careInfo = null;
                    if (this.plantCareAPI.apiKey) {
                        careInfo = await this.plantCareAPI.getPlantCareInfo(
                            plant.commonName || plant.scientificName
                        );
                    }
                    
                    // Build comprehensive care information
                    return {
                        ...plant,
                        // Enhanced care fields for LLM context
                        watering: plant.watering || careInfo?.watering || this.inferWatering(plant),
                        light: plant.light || plant.sunlight || plant.lightRequirement || careInfo?.light || this.inferLight(plant),
                        sunlight: plant.sunlight || plant.light || plant.lightRequirement || careInfo?.light || this.inferLight(plant),
                        soil: plant.soil || plant.soilType || careInfo?.soil || this.inferSoil(plant),
                        humidity: plant.humidity || careInfo?.humidity || this.inferHumidity(plant),
                        temperature: plant.temperature || careInfo?.temperature || this.inferTemperature(plant),
                        fertilizer: plant.fertilizer || plant.fertilizers || plant.fertilityRequirement || careInfo?.fertilizers,
                        toxicity: this.determineToxicity(plant),
                        repotting: this.inferRepotting(plant),
                        commonIssues: plant.pest_susceptibility || careInfo?.diseases || this.inferCommonIssues(plant),
                        careInstructions: this.buildCareInstructions(plant, careInfo),
                        description: this.buildEnhancedDescription(plant, careInfo)
                    };
                } catch (error) {
                    console.warn(`[Care Enhancement] Failed for ${plant.commonName || plant.scientificName}: ${error.message}`);
                    return plant;
                }
            })
        );
    }
    
    /**
     * Build comprehensive care instructions
     */
    buildCareInstructions(plant, careInfo) {
        const instructions = [];
        
        const watering = plant.watering || plant.waterRequirement || careInfo?.watering;
        if (watering) {
            instructions.push(`Watering: ${watering}`);
        }
        
        const light = plant.light || plant.sunlight || plant.lightRequirement || careInfo?.light;
        if (light) {
            instructions.push(`Light: ${light}`);
        }
        
        const soil = plant.soil || plant.soilType || careInfo?.soil;
        if (soil) {
            instructions.push(`Soil: ${soil}`);
        }
        
        const humidity = plant.humidity || careInfo?.humidity;
        if (humidity) {
            instructions.push(`Humidity: ${humidity}`);
        }
        
        const fertilizer = plant.fertilizer || plant.fertilizers || plant.fertilityRequirement || careInfo?.fertilizers;
        if (fertilizer) {
            instructions.push(`Fertilizer: ${fertilizer}`);
        }
        
        const temperature = plant.temperature || careInfo?.temperature;
        if (temperature) {
            instructions.push(`Temperature: ${temperature}`);
        }
        
        return instructions.length > 0 ? instructions.join(' | ') : null;
    }
    
    /**
     * Build enhanced description with care context
     */
    buildEnhancedDescription(plant, careInfo) {
        let description = plant.description || `${plant.commonName || plant.scientificName}`;
        
        if (plant.family) {
            description += ` from the ${plant.family} family`;
        }
        
        if (plant.scientificName && plant.commonName) {
            description += ` (${plant.scientificName})`;
        }
        
        if (plant.edible || plant.edible_fruit || plant.edible_leaf) {
            description += `. Edible plant`;
            if (plant.edibleParts) {
                description += ` with edible ${plant.edibleParts}`;
            }
        }
        
        if (plant.medicinal) {
            description += `. Has medicinal properties`;
        }
        
        if (plant.indoor) {
            description += `. Suitable for indoor growing`;
        }
        
        if (plant.tropical) {
            description += `. Tropical species`;
        }
        
        if (careInfo?.growth) {
            description += `. ${careInfo.growth}`;
        }
        
        return description;
    }
    
    // Inference methods for missing care data
    inferWatering(plant) {
        const family = (plant.family || '').toLowerCase();
        const name = (plant.commonName || plant.scientificName || '').toLowerCase();
        
        if (family.includes('cactaceae') || name.includes('cactus')) {
            return 'Water sparingly when soil is completely dry. Overwatering is the most common cause of problems.';
        }
        
        if (plant.drought_tolerant || plant.droughtTolerance === 'High') {
            return 'Low water needs, drought tolerant. Water deeply but infrequently.';
        }
        
        if (plant.tropical) {
            return 'Regular watering to keep soil consistently moist but not waterlogged.';
        }
        
        if (name.includes('succulent') || name.includes('aloe')) {
            return 'Water deeply but infrequently when soil is dry.';
        }
        
        if (name.includes('fern')) {
            return 'Keep soil consistently moist but not waterlogged. Use filtered water if possible.';
        }
        
        return 'Water when top inch of soil feels dry. Adjust frequency based on season and environment.';
    }
    
    inferLight(plant) {
        const family = (plant.family || '').toLowerCase();
        const name = (plant.commonName || plant.scientificName || '').toLowerCase();
        
        if (family.includes('cactaceae') || name.includes('cactus')) {
            return 'Bright direct to indirect light. Most cacti tolerate full sun.';
        }
        
        if (family.includes('araceae') || name.includes('monstera') || name.includes('pothos') || name.includes('philodendron')) {
            return 'Bright indirect light. Direct sun can scorch leaves.';
        }
        
        if (plant.indoor) {
            return 'Bright indirect light suitable for indoor conditions.';
        }
        
        if (name.includes('fern')) {
            return 'Bright indirect light. Avoid direct sunlight which can burn fronds.';
        }
        
        if (plant.tropical) {
            return 'Bright indirect to filtered light, avoiding harsh direct sun.';
        }
        
        return 'Bright indirect light preferred. Adapt based on plant response.';
    }
    
    inferSoil(plant) {
        const family = (plant.family || '').toLowerCase();
        const name = (plant.commonName || plant.scientificName || '').toLowerCase();
        
        if (family.includes('cactaceae') || name.includes('cactus')) {
            return 'Well-draining cactus/succulent mix. Excellent drainage is essential.';
        }
        
        if (family.includes('araceae')) {
            return 'Well-draining potting mix rich in organic matter. Aroid mixes with perlite and bark work well.';
        }
        
        if (name.includes('succulent') || name.includes('aloe')) {
            return 'Well-draining succulent mix with excellent drainage.';
        }
        
        if (name.includes('fern')) {
            return 'Rich, moisture-retaining potting mix with good drainage. Peat-based mixes often work well.';
        }
        
        if (plant.tropical) {
            return 'Rich, well-draining tropical potting mix with organic matter.';
        }
        
        return 'Well-draining general potting mix. Ensure good drainage while retaining some moisture.';
    }
    
    inferHumidity(plant) {
        const name = (plant.commonName || plant.scientificName || '').toLowerCase();
        
        if (plant.tropical) {
            return 'High humidity preferred (50-70%). Use humidity trays or humidifier.';
        }
        
        if (name.includes('fern')) {
            return 'High humidity preferred (60-80%). Mist regularly or use humidity tray.';
        }
        
        if (name.includes('cactus') || name.includes('succulent')) {
            return 'Low humidity preferred. Avoid high humidity environments.';
        }
        
        return 'Average home humidity (40-50%) acceptable.';
    }
    
    inferTemperature(plant) {
        if (plant.tropical) {
            return 'Warm temperatures (65-80°F). Protect from cold drafts.';
        }
        
        if (plant.hardiness && plant.hardiness.min && plant.hardiness.max) {
            return `Hardy in USDA zones ${plant.hardiness.min}-${plant.hardiness.max}`;
        }
        
        if (plant.hardinessZone) {
            return `Hardy in USDA zones ${plant.hardinessZone}`;
        }
        
        if (plant.minTemperature && plant.maxTemperature) {
            return `Temperature range: ${plant.minTemperature}°F - ${plant.maxTemperature}°F`;
        }
        
        return 'Moderate temperatures (60-75°F). Protect from extreme temperature changes.';
    }
    
    inferRepotting(plant) {
        const name = (plant.commonName || plant.scientificName || '').toLowerCase();
        
        if (name.includes('cactus') || name.includes('succulent')) {
            return 'Repot every 2-3 years or when pot-bound. Use well-draining cactus mix.';
        }
        
        if (plant.growthRate === 'Fast' || plant.growth === 'Fast') {
            return 'Repot annually or when pot-bound due to fast growth rate.';
        }
        
        if (plant.growthRate === 'Slow' || plant.growth === 'Slow') {
            return 'Repot every 2-3 years or when pot-bound. Slow growers don\'t need frequent repotting.';
        }
        
        return 'Repot every 1-2 years or when pot-bound. Best done in spring.';
    }
    
    inferCommonIssues(plant) {
        const name = (plant.commonName || plant.scientificName || '').toLowerCase();
        
        if (name.includes('cactus') || name.includes('succulent')) {
            return 'Overwatering leading to root rot, mealybugs, scale insects.';
        }
        
        if (plant.tropical) {
            return 'Spider mites in low humidity, scale insects, yellowing from overwatering.';
        }
        
        if (name.includes('fern')) {
            return 'Brown tips from low humidity, scale insects, root rot from overwatering.';
        }
        
        return 'Overwatering, spider mites in dry conditions, yellowing leaves from various causes.';
    }
    
    determineToxicity(plant) {
        if (plant.poisonous_to_pets === true || plant.poisonous_to_humans === true) {
            return 'Toxic to pets and/or humans';
        }
        
        if (plant.poisonous_to_pets === false && plant.poisonous_to_humans === false) {
            return 'Non-toxic to pets and humans';
        }
        
        if (plant.edible || plant.edible_fruit || plant.edible_leaf) {
            return 'Edible, generally safe';
        }
        
        // Family-based toxicity knowledge
        const family = (plant.family || '').toLowerCase();
        if (family.includes('araceae')) {
            return 'Potentially toxic - contains calcium oxalate crystals';
        }
        
        return 'Toxicity unknown - research before consumption';
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
                if (plant.source === 'perenual') relevanceScore += 15;     // Has care data
                if (plant.source === 'usda') relevanceScore += 5;          // US-focused
                if (plant.source === 'permapeople') relevanceScore += 7;   // Sustainable focus
                if (plant.source === 'apifarmer') relevanceScore += 6;     // Commercial but good
                
                // Care data availability boost
                if (plant.watering) relevanceScore += 5;
                if (plant.light || plant.sunlight) relevanceScore += 5;
                if (plant.soil) relevanceScore += 5;
                if (plant.careInstructions) relevanceScore += 10;
                
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
 * Health check for the reliable APIs
 */
export async function reliablePlantAPIHealthCheck() {
    const results = {
        gbif: false,
        inaturalist: false,
        usda: false,
        perenual: false,
        permapeople: false,
        apifarmer: false
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
        const perenualResults = await api.perenual.searchPlantsWithCare(testQuery);
        results.perenual = perenualResults && perenualResults.length > 0;
    } catch (e) {
        console.warn(`Perenual test failed: ${e.message}`);
    }
    
    try {
        const permapeopleResults = await api.permapeople.searchPlants(testQuery);
        results.permapeople = permapeopleResults && permapeopleResults.length > 0;
    } catch (e) {
        console.warn(`Permapeople test failed: ${e.message}`);
    }
    
    try {
        const apifarmerResults = await api.apiFarmer.searchPlants(testQuery);
        results.apifarmer = apifarmerResults && apifarmerResults.length > 0;
    } catch (e) {
        console.warn(`APIFarmer test failed: ${e.message}`);
    }
    
    const workingAPIs = Object.values(results).filter(Boolean).length;
    
    return {
        status: workingAPIs >= 3 ? 'healthy' : workingAPIs >= 2 ? 'degraded' : 'unhealthy',
        apis: results,
        workingCount: workingAPIs,
        totalCount: Object.keys(results).length,
        advantages: [
            'GBIF: Completely free, massive database, no API key needed',
            'iNaturalist: Community-verified, excellent coverage, no API key needed', 
            'USDA: Authoritative US plant data, no API key needed',
            'Perenual: Commercial quality with CARE DATA, requires free API key',
            'Permapeople: Sustainable/edible plants, completely free',
            'APIFarmer: Growth requirements data, requires paid API key'
        ]
    };
}