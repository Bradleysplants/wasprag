// src/syncTrefleData.js (ESM Version - Functional - userId Optional)

// --- Imports ---
import { Prisma } from '@prisma/client'; // For error checking if needed
// Import utilities - Adjust paths if necessary
import { trefleApiTools } from './utils/trefleApi.js';
import { generateTextEmbedding } from './utils/languageModel.js';
// Using context.entities for DB operations

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
        console.error("❌ Job Error: PlantInfo entity not available in job context. Check main.wasp entities declaration for the job.");
        throw new Error("Configuration error: PlantInfo entity missing in job context.");
    }
    const PlantInfo = context.entities.PlantInfo; // Alias for easier use

    // --- Job Logic ---
    let successCount = 0;
    let errorCount = 0;
    let fetchError = null;

    try {
        // ==============================================
        // === 1. Fetch Data from Source (Trefle)     ===
        // ==============================================
        console.log("   Fetching initial list of plants from Trefle API (Page 1)...");
        // Example: Fetch first 20 plants matching 'leaf'
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
            console.log(`   Processing Trefle ID: ${plantId} (${primaryName})...`);

            try {
                // --- a) Get Full Details ---
                console.log(`      Fetching details for Trefle ID ${plantId}...`);
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
                 ].filter(Boolean).join(' | ').trim();

                 if (!textToEmbed) {
                     console.warn(`      Skipping ${plantDetails.name} (ID: ${plantId}): Not enough text content for embedding.`);
                     continue;
                 }

                 console.log(`      Generating embedding for ${plantDetails.name}...`);
                 const embedding = await generateTextEmbedding(textToEmbed);

                 if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
                     console.error(`      Failed to generate embedding for ${plantDetails.name}. Skipping storage.`);
                     errorCount++;
                     continue;
                 }
                 console.log(`      Embedding generated (dimension: ${embedding.length}).`);

                // --- c) Store/Update in Database ---
                // Prepare data matching the Prisma PlantInfo schema
                const plantDataForDb = {
                    name:           plantDetails.name,
                    scientificName: plantDetails.scientificName || null,
                    description:    plantDetails.description || '',
                    careInfo:       plantDetails.careInfo || null,
                    soilNeeds:      plantDetails.soilNeeds || null,
                    source:         plantDetails.source || `Trefle API Sync (ID: ${plantDetails.id})`,
                    // userId:         is NOT included, as it's optional
                };

                console.log(`      Upserting ${plantDetails.name} into database...`);

                await PlantInfo.upsert({
                    where: {
                        // Use the compound unique key
                        name_scientificName: {
                            name: plantDataForDb.name,
                            scientificName: plantDataForDb.scientificName
                        }
                    },
                    create: {
                        ...plantDataForDb,
                        embedding: embedding,
                        // No userId needed here
                    },
                    update: {
                        description: plantDataForDb.description,
                        careInfo: plantDataForDb.careInfo,
                        soilNeeds: plantDataForDb.soilNeeds,
                        source: plantDataForDb.source,
                        embedding: embedding,
                        updatedAt: new Date(),
                        // Do NOT update userId here, leave it as it was (could be null or set by a user previously)
                    },
                });

                successCount++;
                console.log(`      Successfully processed ${plantDetails.name} (Trefle ID: ${plantId}).`);

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
        if (fetchError) {
            console.log("   Initial Trefle fetch failed.");
        }
        console.log(`   Successfully Processed: ${successCount}`);
        console.log(`   Errors during processing: ${errorCount}`);
        console.log("✅ --- syncTrefleData job finished ---");
        // Decide if errors should cause the job to be marked as failed
        if (fetchError || (errorCount > 0 && successCount === 0)) {
           // throw new Error(`Job finished with errors. Fetch Error: ${fetchError?.message}, Processing Errors: ${errorCount}`);
        }
    }
};

// --- Export ---
export const syncTrefleData = syncTrefleDataFn;