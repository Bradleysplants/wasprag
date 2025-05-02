// src/syncTrefleData.js (Refactored for Modular Imports)

// --- Imports ---
import { Prisma } from '@prisma/client'; // For error checking if needed
// Import utilities - Adjust paths if necessary
import { trefleApiTools } from '../utils/trefleApi'; // Keep this import
// --- UPDATED IMPORT ---
import { generateTextEmbedding } from '../utils/embeddings'; // Import from new embedding module
// Import config specifically where needed (like for embedding dimension)
// import { MODEL_CONFIG } from './utils/config.js'; // Import if needed globally or within functions


/**
 * Wasp Job function to synchronize data from Trefle API
 * with the local database, including generating embeddings.
 * Assumes the PlantInfo.userId field is OPTIONAL in schema.prisma.
 *
 * @param {object} args - Arguments passed to the job (currently none).
 * @param {object} context - Job context provided by Wasp. Includes `context.entities.PlantInfo`.
 */
const syncTrefleDataFn = async (args, context) => {
    console.log("🚀 --- Starting syncTrefleData job (userId is Optional) ---");

    // --- Validate Context ---
    if (!context.entities?.PlantInfo) {
        console.error("❌ Job Error: PlantInfo entity not available in job context.");
        throw new Error("Configuration error: PlantInfo entity missing in job context.");
    }
    const PlantInfo = context.entities.PlantInfo; // Alias for easier use

    // --- Job Logic ---
    let successCount = 0;
    let errorCount = 0;
    let fetchError = null;

    // Get expected embedding dimension from config
    let expectedDimension;
    try {
         const { MODEL_CONFIG } = await import('../utils/config.js');
         expectedDimension = MODEL_CONFIG.embeddingDimension;
    } catch (configError) {
         console.error("❌ Job Error: Could not load configuration to get embedding dimension.", configError);
         throw new Error("Configuration error: Cannot determine embedding dimension.");
    }


    try {
        // ==============================================
        // === 1. Fetch Data from Source (Trefle)     ===
        // ==============================================
        console.log("   Fetching initial list of plants from Trefle API (Page 1)...");
        // Example: Fetch first 20 plants matching 'leaf' - adjust query/limit as needed
        const plantListPage = await trefleApiTools.searchPlants('leaf', 1, 20);
        const plantsToSync = plantListPage || [];

        if (!plantsToSync || plantsToSync.length === 0) {
            console.log("   No new/updated plants found from Trefle API to sync.");
            console.log("✅ --- syncTrefleData job finished successfully (no data) ---");
            return;
        }
        console.log(`   Found ${plantsToSync.length} plants summaries from Trefle. Processing...`);

        // ==========================================================
        // === 2. Process Each Item (Fetch Details, Embed, Store) ===
        // ==========================================================
        for (const plantSummary of plantsToSync) {
            const plantId = plantSummary.id;
            const primaryName = plantSummary.common_name || plantSummary.scientific_name;

            if (!plantId || !primaryName) {
                 console.warn(`      Skipping plant summary - missing ID or Name. Summary:`, plantSummary);
                 continue;
            }
            // console.log(`   Processing Trefle ID: ${plantId} (${primaryName})...`); // Less verbose

            try {
                // --- a) Get Full Details ---
                // console.log(`      Fetching details for Trefle ID ${plantId}...`); // Less verbose
                const plantDetails = await trefleApiTools.getPlantDetails(plantId);

                if (!plantDetails || !plantDetails.id) {
                    console.warn(`      Skipping Trefle ID ${plantId} - Failed to fetch details or details missing ID.`);
                    continue;
                }

                 // --- b) Prepare Data & Generate Embedding ---
                 const textToEmbed = [
                     plantDetails.name,
                     plantDetails.scientificName,
                     plantDetails.description,
                     plantDetails.careInfo,
                     plantDetails.soilNeeds
                 ].filter(Boolean).join(' | ').trim(); // filter(Boolean) removes null/undefined/empty strings

                 if (!textToEmbed) {
                     console.warn(`      Skipping ${plantDetails.name} (ID: ${plantId}): Not enough text content for embedding.`);
                     continue;
                 }

                 // console.log(`      Generating embedding for ${plantDetails.name}...`); // Less verbose
                 // ** Uses imported function **
                 const embedding = await generateTextEmbedding(textToEmbed);

                 // Validate embedding
                 if (!embedding || !Array.isArray(embedding) || embedding.length !== expectedDimension) {
                     console.error(`      Failed to generate valid embedding (expected ${expectedDimension}, got ${embedding?.length}) for ${plantDetails.name}. Skipping storage.`);
                     errorCount++;
                     continue;
                 }
                 // console.log(`      Embedding generated (dimension: ${embedding.length}).`); // Less verbose

                // --- c) Store/Update in Database ---
                const plantDataForDb = {
                    name:           plantDetails.name,
                    scientificName: plantDetails.scientificName || null,
                    description:    plantDetails.description || '',
                    careInfo:       plantDetails.careInfo || null,
                    soilNeeds:      plantDetails.soilNeeds || null,
                    source:         plantDetails.source || `Trefle API Sync (ID: ${plantDetails.id})`,
                    // userId is omitted for sync job - data is global/unowned initially
                };

                // console.log(`      Upserting ${plantDetails.name} into database...`); // Less verbose

                await PlantInfo.upsert({
                    where: {
                        // Use the compound unique key defined in schema.prisma
                        // ASSUMPTION: unique key is on name + scientificName GLOBALLY
                        name_scientificName: {
                            name: plantDataForDb.name,
                            scientificName: plantDataForDb.scientificName // Handles null correctly
                        }
                        // If your unique key includes userId, this upsert won't work
                        // correctly for updating user-added plants vs sync-added plants
                        // without more complex logic. Assuming global uniqueness for now.
                    },
                    create: {
                        ...plantDataForDb,
                        embedding: embedding,
                        // userId: null, // Explicitly null if needed by schema/logic
                    },
                    update: {
                        description: plantDataForDb.description,
                        careInfo: plantDataForDb.careInfo,
                        soilNeeds: plantDataForDb.soilNeeds,
                        source: plantDataForDb.source, // Update source in case it changed
                        embedding: embedding, // Always update embedding
                        updatedAt: new Date(),
                        // DO NOT update userId here - preserve original owner if any
                    },
                });

                successCount++;
                // console.log(`      Successfully processed ${plantDetails.name} (Trefle ID: ${plantId}).`); // Less verbose

            } catch (plantError) {
                errorCount++;
                console.error(`      ❌ Failed to process plant ${primaryName} (Trefle ID: ${plantId}):`, plantError instanceof Error ? plantError.message : plantError);
            }
        } // End for loop

    } catch (error) {
        fetchError = error;
        console.error("❌ Error fetching initial plant list from Trefle:", error);
    } finally {
        // Log final summary
        console.log("--- Job Summary ---");
        if (fetchError) { console.log("   Initial Trefle fetch failed."); }
        console.log(`   Successfully Processed/Upserted: ${successCount}`);
        console.log(`   Errors during processing: ${errorCount}`);
        console.log("✅ --- syncTrefleData job finished ---");
        // Optional: Decide if errors should cause the job to fail in Wasp's view
        // if (fetchError || (errorCount > 0 && successCount === 0)) {
        //    throw new Error(`Job finished with errors.`);
        // }
    }
};

// --- Export ---
export const syncTrefleData = syncTrefleDataFn;