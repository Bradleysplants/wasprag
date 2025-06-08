// src/server/utils/plantExtractor.js - Bulletproof plant name extraction using multiple reliable methods

/**
 * 🌟 BULLETPROOF PLANT NAME EXTRACTOR 🌟
 * 
 * Uses 5 different approaches:
 * 1. Comprehensive plant database lookup
 * 2. Fuzzy matching for typos/variations  
 * 3. Scientific name pattern recognition
 * 4. Contextual analysis
 * 5. Multi-source validation
 */

// Comprehensive plant databases (curated from multiple sources)
const PLANT_DATABASES = {
    // Most common houseplants (high confidence)
    houseplants: [
        'aloe vera', 'snake plant', 'pothos', 'peace lily', 'rubber plant',
        'fiddle leaf fig', 'monstera', 'monstera deliciosa', 'spider plant',
        'philodendron', 'ficus', 'dracaena', 'palm', 'bamboo palm', 'majesty palm',
        'chinese evergreen', 'aglaonema', 'dieffenbachia', 'croton', 'calathea',
        'maranta', 'prayer plant', 'boston fern', 'bird of paradise', 'rubber tree',
        'jade plant', 'money tree', 'pachira aquatica', 'zz plant', 'zamioculcas',
        'anthurium', 'bromeliad', 'orchid', 'phalaenopsis', 'cattleya',
        'christmas cactus', 'easter cactus', 'thanksgiving cactus', 'prickly pear'
    ],
    
    // Popular flowering plants
    flowering: [
        'hibiscus', 'rosa', 'rose', 'azalea', 'rhododendron', 'camellia',
        'gardenia', 'jasmine', 'bougainvillea', 'oleander', 'lavender',
        'sunflower', 'marigold', 'petunia', 'impatiens', 'begonia',
        'geranium', 'pansy', 'viola', 'zinnia', 'cosmos', 'dahlia',
        'lily', 'tulip', 'daffodil', 'hyacinth', 'crocus', 'iris'
    ],
    
    // Trees and outdoor plants
    trees: [
        'maple', 'oak', 'pine', 'fir', 'spruce', 'cedar', 'cypress',
        'willow', 'birch', 'elm', 'ash', 'cherry', 'apple', 'pear',
        'citrus', 'lemon', 'orange', 'lime', 'grapefruit', 'fig',
        'magnolia', 'dogwood', 'redbud', 'serviceberry', 'hawthorn'
    ],
    
    // Herbs and edibles  
    herbs: [
        'basil', 'oregano', 'thyme', 'rosemary', 'sage', 'mint', 'cilantro',
        'parsley', 'chives', 'dill', 'fennel', 'lavender', 'chamomile',
        'lemon balm', 'catnip', 'chervil', 'tarragon', 'marjoram'
    ],
    
    // Succulents and cacti
    succulents: [
        'echeveria', 'sedum', 'sempervivum', 'hens and chicks', 'jade',
        'crassula', 'haworthia', 'aloe', 'agave', 'barrel cactus',
        'prickly pear', 'christmas cactus', 'easter cactus', 'string of pearls',
        'string of hearts', 'burros tail', 'ghost plant', 'black prince'
    ],
    
    // Vegetables and crops
    vegetables: [
        'tomato', 'pepper', 'cucumber', 'zucchini', 'squash', 'pumpkin',
        'lettuce', 'spinach', 'kale', 'chard', 'arugula', 'radish',
        'carrot', 'beet', 'onion', 'garlic', 'potato', 'sweet potato',
        'corn', 'beans', 'peas', 'broccoli', 'cauliflower', 'cabbage'
    ]
};

// Scientific name patterns (genus species format)
const SCIENTIFIC_PATTERNS = [
    // Standard binomial nomenclature
    /\b([A-Z][a-z]+)\s+([a-z]+)\b/g,
    // With variety/cultivar indicators
    /\b([A-Z][a-z]+)\s+([a-z]+)\s+(var\.|cv\.|subsp\.)\s+([a-z]+)/g,
    // With author abbreviations
    /\b([A-Z][a-z]+)\s+([a-z]+)\s+([A-Z][a-z]*\.?)/g
];

// Plant-related context words (help identify plant discussions)
const PLANT_CONTEXT_WORDS = [
    'plant', 'flower', 'tree', 'bush', 'shrub', 'herb', 'vine', 'fern',
    'grass', 'moss', 'algae', 'garden', 'grow', 'growing', 'cultivation',
    'watering', 'fertilizer', 'soil', 'pot', 'repot', 'prune', 'trim',
    'bloom', 'flowering', 'propagate', 'cutting', 'seed', 'germinate',
    'photosynthesis', 'chlorophyll', 'root', 'stem', 'leaf', 'petal',
    'botany', 'botanical', 'horticulture', 'gardening', 'nursery'
];

/**
 * Simple Levenshtein distance for fuzzy matching
 */
function levenshteinDistance(str1, str2) {
    const matrix = [];
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    return matrix[str2.length][str1.length];
}

/**
 * Fuzzy match a word against plant database
 */
function fuzzyMatchPlant(word, maxDistance = 2) {
    const allPlants = Object.values(PLANT_DATABASES).flat();
    const matches = [];
    
    for (const plant of allPlants) {
        const plantWords = plant.toLowerCase().split(' ');
        
        // Check each word in plant name
        for (const plantWord of plantWords) {
            const distance = levenshteinDistance(word.toLowerCase(), plantWord);
            
            if (distance <= maxDistance && plantWord.length > 3) {
                const similarity = 1 - (distance / Math.max(word.length, plantWord.length));
                matches.push({
                    plant: plant,
                    matchedWord: plantWord,
                    similarity: similarity,
                    distance: distance,
                    type: 'fuzzy'
                });
            }
        }
        
        // Check full plant name
        const fullDistance = levenshteinDistance(word.toLowerCase(), plant.toLowerCase());
        if (fullDistance <= maxDistance && plant.length > 3) {
            const similarity = 1 - (fullDistance / Math.max(word.length, plant.length));
            matches.push({
                plant: plant,
                matchedWord: plant,
                similarity: similarity,
                distance: fullDistance,
                type: 'fuzzy_full'
            });
        }
    }
    
    return matches.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Extract scientific names using pattern matching
 */
function extractScientificNames(text) {
    const scientificNames = [];
    
    SCIENTIFIC_PATTERNS.forEach(pattern => {
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const genus = match[1];
            const species = match[2];
            const fullName = `${genus} ${species}`;
            
            // Basic validation - genus should be capitalized, species lowercase
            if (genus[0] === genus[0].toUpperCase() && 
                species === species.toLowerCase() &&
                genus.length > 2 && species.length > 2) {
                
                scientificNames.push({
                    plant: fullName,
                    genus: genus,
                    species: species,
                    start: match.index,
                    end: match.index + fullName.length,
                    type: 'scientific',
                    confidence: 0.8
                });
            }
        }
    });
    
    return scientificNames;
}

/**
 * Context-aware plant extraction
 */
function extractWithContext(text) {
    const words = text.toLowerCase().split(/\s+/);
    const contextMatches = [];
    
    // Find plant context words
    const contextIndices = [];
    words.forEach((word, index) => {
        if (PLANT_CONTEXT_WORDS.includes(word)) {
            contextIndices.push(index);
        }
    });
    
    // Look for potential plant names near context words
    contextIndices.forEach(contextIndex => {
        const searchRange = 3; // Look 3 words before/after context
        
        for (let i = Math.max(0, contextIndex - searchRange); 
             i <= Math.min(words.length - 1, contextIndex + searchRange); 
             i++) {
            
            if (i === contextIndex) continue;
            
            const word = words[i];
            
            // Skip common words
            const commonWords = ['the', 'a', 'an', 'my', 'your', 'this', 'that', 'some', 'many', 'few', 'how', 'what', 'when', 'where', 'why', 'can', 'should', 'would', 'could'];
            if (commonWords.includes(word) || word.length < 3) continue;
            
            // Check if it might be a plant name
            const fuzzyMatches = fuzzyMatchPlant(word, 1);
            if (fuzzyMatches.length > 0) {
                contextMatches.push({
                    plant: fuzzyMatches[0].plant,
                    originalWord: word,
                    contextWord: words[contextIndex],
                    confidence: fuzzyMatches[0].similarity * 0.7, // Reduce confidence for context-based
                    type: 'context',
                    fuzzyMatch: fuzzyMatches[0]
                });
            }
        }
    });
    
    return contextMatches;
}

/**
 * Direct database lookup (exact and partial matches)
 */
function directDatabaseLookup(text) {
    const allPlants = Object.values(PLANT_DATABASES).flat();
    const matches = [];
    const lowerText = text.toLowerCase();
    
    allPlants.forEach(plant => {
        const plantLower = plant.toLowerCase();
        
        // Exact match
        if (lowerText.includes(plantLower)) {
            const start = lowerText.indexOf(plantLower);
            matches.push({
                plant: plant,
                start: start,
                end: start + plant.length,
                type: 'exact',
                confidence: 0.95,
                method: 'database_exact'
            });
        }
        
        // Partial word boundary match
        const regex = new RegExp(`\\b${plantLower.replace(/\s+/g, '\\s+')}\\b`, 'gi');
        const regexMatches = lowerText.match(regex);
        if (regexMatches) {
            regexMatches.forEach(match => {
                const start = lowerText.indexOf(match.toLowerCase());
                matches.push({
                    plant: plant,
                    start: start,
                    end: start + match.length,
                    type: 'word_boundary',
                    confidence: 0.9,
                    method: 'database_boundary'
                });
            });
        }
    });
    
    return matches;
}

/**
 * Multi-source validation - cross-check results
 */
function validateResults(results) {
    const validated = [];
    const groupedByPlant = {};
    
    // Group results by plant name
    results.forEach(result => {
        const plantKey = result.plant.toLowerCase();
        if (!groupedByPlant[plantKey]) {
            groupedByPlant[plantKey] = [];
        }
        groupedByPlant[plantKey].push(result);
    });
    
    // Validate each plant
    Object.keys(groupedByPlant).forEach(plantKey => {
        const group = groupedByPlant[plantKey];
        
        // If multiple methods found the same plant, increase confidence
        if (group.length > 1) {
            const bestResult = group.sort((a, b) => b.confidence - a.confidence)[0];
            bestResult.confidence = Math.min(0.98, bestResult.confidence + 0.2);
            bestResult.validated = true;
            bestResult.methods = group.map(r => r.method || r.type);
            validated.push(bestResult);
        } else {
            // Single method - keep if confidence is high enough
            const result = group[0];
            if (result.confidence > 0.6) {
                validated.push(result);
            }
        }
    });
    
    return validated.sort((a, b) => b.confidence - a.confidence);
}

/**
 * 🌟 MAIN EXTRACTION FUNCTION 🌟
 * Uses all methods and combines results
 */
export async function extractPlantNames(text) {
    console.log(`[Plant Extractor] 🌱 Processing: "${text.substring(0, 100)}..."`);
    
    const allResults = [];
    
    try {
        // Method 1: Direct database lookup (highest confidence)
        console.log(`[Plant Extractor] 🎯 Method 1: Database lookup...`);
        const databaseResults = directDatabaseLookup(text);
        allResults.push(...databaseResults);
        console.log(`[Plant Extractor] Found ${databaseResults.length} database matches`);
        
        // Method 2: Scientific name extraction
        console.log(`[Plant Extractor] 🔬 Method 2: Scientific names...`);
        const scientificResults = extractScientificNames(text);
        allResults.push(...scientificResults);
        console.log(`[Plant Extractor] Found ${scientificResults.length} scientific names`);
        
        // Method 3: Context-aware extraction
        console.log(`[Plant Extractor] 🧠 Method 3: Context analysis...`);
        const contextResults = extractWithContext(text);
        allResults.push(...contextResults);
        console.log(`[Plant Extractor] Found ${contextResults.length} context matches`);
        
        // Method 4: Fuzzy matching for individual words
        console.log(`[Plant Extractor] 🔍 Method 4: Fuzzy matching...`);
        const words = text.split(/\s+/);
        words.forEach(word => {
            if (word.length > 3) {
                const fuzzyMatches = fuzzyMatchPlant(word, 1);
                if (fuzzyMatches.length > 0 && fuzzyMatches[0].similarity > 0.8) {
                    allResults.push({
                        plant: fuzzyMatches[0].plant,
                        originalWord: word,
                        confidence: fuzzyMatches[0].similarity,
                        type: 'fuzzy',
                        method: 'fuzzy_word'
                    });
                }
            }
        });
        
        // Method 5: Multi-source validation
        console.log(`[Plant Extractor] ✅ Method 5: Validation...`);
        const validatedResults = validateResults(allResults);
        
        // Convert to standard format
        const standardResults = validatedResults.map(result => ({
            entity_group: result.type === 'scientific' ? 'PLANT_SCI' : 'PLANT_COMMON',
            score: result.confidence,
            word: result.plant,
            start: result.start || 0,
            end: result.end || result.plant.length,
            source: 'multi_method',
            methods: result.methods || [result.method || result.type],
            validated: result.validated || false
        }));
        
        console.log(`[Plant Extractor] ✅ Final results: ${standardResults.length} validated plants`);
        standardResults.forEach(r => 
            console.log(`  - "${r.word}" (${r.entity_group}, score: ${r.score.toFixed(3)}, methods: ${r.methods.join(',')})`)
        );
        
        return standardResults;
        
    } catch (error) {
        console.error(`[Plant Extractor] ❌ Error: ${error.message}`);
        
        // Emergency fallback - simple keyword matching
        const emergencyResults = [];
        const allPlants = Object.values(PLANT_DATABASES).flat();
        
        allPlants.forEach(plant => {
            if (text.toLowerCase().includes(plant.toLowerCase())) {
                emergencyResults.push({
                    entity_group: 'PLANT_COMMON',
                    score: 0.7,
                    word: plant,
                    start: 0,
                    end: plant.length,
                    source: 'emergency_fallback'
                });
            }
        });
        
        console.log(`[Plant Extractor] 🚨 Emergency fallback found ${emergencyResults.length} plants`);
        return emergencyResults;
    }
}

/**
 * API-based validation using external plant databases
 */
export async function validateWithExternalAPIs(plantNames) {
    const validatedPlants = [];
    
    for (const plantName of plantNames) {
        try {
            // Use Perenual API (free tier available)
            const apiKey = process.env.PERENUAL_API_KEY;
            if (apiKey) {
                const response = await fetch(`https://perenual.com/api/species-list?key=${apiKey}&q=${encodeURIComponent(plantName)}&page=1`);
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.data && data.data.length > 0) {
                        const plant = data.data[0];
                        validatedPlants.push({
                            originalName: plantName,
                            validatedName: plant.common_name,
                            scientificName: plant.scientific_name?.[0],
                            confidence: 0.95,
                            source: 'perenual_api',
                            apiData: plant
                        });
                        console.log(`[Plant Extractor] ✅ API validated: "${plantName}" → "${plant.common_name}"`);
                        continue;
                    }
                }
            }
            
            // If API validation fails, keep original with lower confidence
            validatedPlants.push({
                originalName: plantName,
                validatedName: plantName,
                confidence: 0.7,
                source: 'local_database'
            });
            
        } catch (error) {
            console.warn(`[Plant Extractor] ⚠️ API validation failed for "${plantName}": ${error.message}`);
            validatedPlants.push({
                originalName: plantName,
                validatedName: plantName,
                confidence: 0.6,
                source: 'fallback'
            });
        }
    }
    
    return validatedPlants;
}

/**
 * Health check function
 */
export async function plantExtractorHealthCheck() {
    const testCases = [
        { text: 'How do I care for my hibiscus?', expected: ['hibiscus'] },
        { text: 'My Monstera deliciosa needs repotting', expected: ['monstera deliciosa'] },
        { text: 'Peace lily watering tips', expected: ['peace lily'] },
        { text: 'Aloe vera propagation guide', expected: ['aloe vera'] },
        { text: 'Rosa damascena pruning', expected: ['rosa'] }
    ];
    
    const results = [];
    
    for (const testCase of testCases) {
        try {
            const found = await extractPlantNames(testCase.text);
            const foundNames = found.map(f => f.word.toLowerCase());
            const expectedNames = testCase.expected.map(e => e.toLowerCase());
            
            const hasExpected = expectedNames.some(expected => 
                foundNames.some(found => found.includes(expected) || expected.includes(found))
            );
            
            results.push({
                text: testCase.text,
                expected: testCase.expected,
                found: found.map(f => f.word),
                success: hasExpected
            });
            
        } catch (error) {
            results.push({
                text: testCase.text,
                expected: testCase.expected,
                found: [],
                success: false,
                error: error.message
            });
        }
    }
    
    const successCount = results.filter(r => r.success).length;
    
    return {
        status: successCount >= testCases.length * 0.8 ? 'healthy' : 'degraded',
        testResults: results,
        successRate: `${successCount}/${testCases.length}`,
        databaseSize: Object.values(PLANT_DATABASES).flat().length
    };
}