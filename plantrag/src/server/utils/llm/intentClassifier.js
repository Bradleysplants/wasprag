// src/server/utils/llm/intentClassifier.js

/**
 * Enhanced programmatic intent classification
 * Integrates with your existing NER model and replaces LLM classification
 */

export class EnhancedIntentClassifier {
    constructor() {
        // Plant care patterns - optimized for your Hibiscus/plant care use case
        this.carePatterns = {
            watering: {
                keywords: ['water', 'watering', 'hydrate', 'irrigation', 'moisture', 'wet', 'dry', 'thirsty', 'drink'],
                phrases: ['how much water', 'when to water', 'watering schedule', 'water needs', 'overwatered', 'underwatered', 'how often water'],
                questions: ['how often', 'how much', 'when should', 'how frequently', 'how many times'],
                weight: 1.0
            },
            light: {
                keywords: ['light', 'lighting', 'sun', 'sunlight', 'shade', 'brightness', 'dark', 'sunny', 'shadow'],
                phrases: ['light requirements', 'sun exposure', 'bright light', 'indirect light', 'full sun', 'partial shade'],
                questions: ['how much light', 'what kind of light', 'where to place', 'which window'],
                weight: 1.0
            },
            soil: {
                keywords: ['soil', 'dirt', 'potting', 'compost', 'fertilizer', 'nutrients', 'ph', 'drainage', 'feed'],
                phrases: ['soil type', 'potting mix', 'soil requirements', 'fertilizer needs', 'plant food'],
                questions: ['what soil', 'which fertilizer', 'how to fertilize', 'what nutrients'],
                weight: 1.0
            },
            health: {
                keywords: ['sick', 'dying', 'disease', 'pest', 'bug', 'yellow', 'brown', 'wilting', 'drooping', 'problem'],
                phrases: ['what\'s wrong', 'plant problems', 'leaves turning', 'not growing', 'looks bad'],
                questions: ['why is', 'what\'s happening', 'help my plant', 'what\'s wrong'],
                weight: 1.0
            },
            care: {
                keywords: ['care', 'maintain', 'keep', 'healthy', 'tips', 'advice', 'help', 'guide'],
                phrases: ['how to care', 'plant care', 'keep healthy', 'care tips', 'growing guide'],
                questions: ['how do I', 'what should I', 'how to keep', 'how to grow'],
                weight: 0.8
            }
        };

        // General conversation patterns
        this.generalPatterns = {
            greeting: {
                keywords: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'greetings'],
                phrases: ['how are you', 'what\'s up', 'nice to meet', 'good to see'],
                exact: ['hi', 'hello', 'hey there', 'good morning', 'good afternoon', 'hey'],
                weight: 1.0
            },
            thanks: {
                keywords: ['thank', 'thanks', 'appreciate', 'grateful', 'awesome', 'great'],
                phrases: ['thank you', 'thanks for', 'appreciate it', 'thanks so much'],
                exact: ['thanks', 'thank you', 'ty', 'thx', 'cheers'],
                weight: 1.0
            },
            goodbye: {
                keywords: ['bye', 'goodbye', 'see you', 'farewell', 'later', 'leave'],
                phrases: ['talk to you later', 'see you soon', 'have a good', 'take care'],
                exact: ['bye', 'goodbye', 'see ya', 'later', 'cya'],
                weight: 1.0
            }
        };

        // Question indicators
        this.questionWords = ['what', 'how', 'when', 'where', 'why', 'which', 'who', 'can', 'should', 'do', 'does', 'is', 'are', 'will', 'would', 'could'];
        
        // Plant-related context words
        this.plantContextWords = ['plant', 'flower', 'tree', 'garden', 'grow', 'growing', 'leaf', 'leaves', 'root', 'stem', 'bloom', 'blossom', 'botanical'];
    }

    /**
     * Main classification method - integrates with your NER entities
     */
    classifyIntent(text, entities = []) {
        const normalizedText = text.toLowerCase().trim();
        const words = normalizedText.split(/\s+/);
        const hasPlantEntities = entities && entities.length > 0;
        
        console.log(`[Intent Classifier] Analyzing: "${text}"`);
        console.log(`[Intent Classifier] Found ${entities.length} entities: ${entities.map(e => e.text || e).join(', ')}`);
        
        // Check for questions
        const isQuestion = this.isQuestion(normalizedText, words);
        
        // Check for plant context
        const hasPlantContext = this.hasPlantContext(normalizedText) || hasPlantEntities;
        
        console.log(`[Intent Classifier] isQuestion: ${isQuestion}, hasPlantContext: ${hasPlantContext}`);
        
        // Classify based on patterns
        const results = [];
        
        // Check care-specific intents (higher priority if plant entities found)
        if (hasPlantContext || hasPlantEntities) {
            for (const [careType, patterns] of Object.entries(this.carePatterns)) {
                const score = this.calculatePatternScore(normalizedText, words, patterns);
                if (score > 0.2) { // Lower threshold for plant care
                    const adjustedScore = Math.min(score * patterns.weight + (hasPlantEntities ? 0.3 : 0.1), 1.0);
                    results.push({
                        intent: careType === 'care' ? 'plant_care' : `plant_care_${careType}`,
                        confidence: adjustedScore,
                        category: 'plant_care',
                        matchedPatterns: this.getMatchedPatterns(normalizedText, words, patterns)
                    });
                }
            }
        }
        
        // Check general conversation intents
        for (const [genType, patterns] of Object.entries(this.generalPatterns)) {
            const score = this.calculatePatternScore(normalizedText, words, patterns);
            if (score > 0.3) {
                results.push({
                    intent: `general_${genType}`,
                    confidence: score * patterns.weight,
                    category: 'general',
                    matchedPatterns: this.getMatchedPatterns(normalizedText, words, patterns)
                });
            }
        }
        
        // Sort by confidence
        results.sort((a, b) => b.confidence - a.confidence);
        
        // Determine final intent
        let finalIntent = 'general_conversation';
        let finalConfidence = 0.5;
        let reasoning = 'Default fallback';
        
        if (results.length > 0) {
            const topResult = results[0];
            finalIntent = topResult.intent;
            finalConfidence = topResult.confidence;
            reasoning = `Best match: ${topResult.matchedPatterns.join(', ')}`;
        }
        
        // Special cases and overrides:
        
        // 1. If we have plant entities, bias heavily toward plant care
        if (hasPlantEntities && finalConfidence < 0.8) {
            if (!finalIntent.startsWith('plant_') && !finalIntent.includes('mixed')) {
                finalIntent = 'mixed';
                finalConfidence = Math.max(finalConfidence + 0.3, 0.8);
                reasoning = 'Plant entities detected - upgraded to mixed intent';
            }
        }
        
        // 2. If we detect plant context (even without entities), bias toward mixed
        if (hasPlantContext && !hasPlantEntities && finalConfidence < 0.7) {
            if (!finalIntent.startsWith('plant_') && !finalIntent.includes('mixed')) {
                finalIntent = 'mixed';
                finalConfidence = Math.max(finalConfidence + 0.2, 0.7);
                reasoning = 'Plant context detected without entities - treating as mixed';
            }
        }
        
        // 3. If no results but we have plant context or entities, default to mixed
        if (results.length === 0 && (hasPlantContext || hasPlantEntities)) {
            finalIntent = 'mixed';
            finalConfidence = 0.7;
            reasoning = 'No specific intent but plant context/entities detected';
        }
        
        // Log the decision
        console.log(`[Intent Classifier] Final: ${finalIntent} (confidence: ${finalConfidence.toFixed(3)})`);
        console.log(`[Intent Classifier] Reasoning: ${reasoning}`);
        
        return {
            intent: finalIntent,
            confidence: finalConfidence,
            isQuestion,
            hasPlantContext,
            hasPlantEntities,
            reasoning,
            alternatives: results.slice(1, 3),
            analysis: {
                wordCount: words.length,
                entityCount: entities.length,
                questionIndicators: this.getQuestionIndicators(normalizedText, words),
                topMatches: results.slice(0, 3)
            }
        };
    }
    
    /**
     * Check if text is a question
     */
    isQuestion(text, words) {
        // Ends with question mark
        if (text.endsWith('?')) return true;
        
        // Starts with question word
        if (words.length > 0 && this.questionWords.includes(words[0])) return true;
        
        // Contains question patterns
        const questionPatterns = [
            /^(can|could|would|should|do|does|is|are|will)\s+/,
            /\b(how to|what is|what are|when to|where to|why does|tell me|show me)\b/,
            /\b(help|explain)\b.*\?*$/
        ];
        
        return questionPatterns.some(pattern => pattern.test(text));
    }
    
    /**
     * Check if text has plant context
     */
    hasPlantContext(text) {
        // Check for plant context words
        const hasPlantWords = this.plantContextWords.some(word => {
            const regex = new RegExp(`\\b${word}\\b`, 'i');
            return regex.test(text);
        });
        
        // Check for common plant names (case insensitive, whole words)
        const commonPlants = ['hibiscus', 'rose', 'fern', 'succulent', 'cactus', 'orchid', 'lily', 'tulip', 'daisy', 'ivy'];
        const hasCommonPlants = commonPlants.some(plant => {
            const regex = new RegExp(`\\b${plant}\\b`, 'i');
            return regex.test(text);
        });
        
        return hasPlantWords || hasCommonPlants;
    }
    
    /**
     * Calculate pattern match score
     */
    calculatePatternScore(text, words, patterns) {
        let score = 0;
        let maxPossible = 0;
        
        // Check exact matches (highest weight) - must be whole words
        if (patterns.exact) {
            maxPossible += 0.4;
            const exactMatches = patterns.exact.filter(phrase => {
                const regex = new RegExp(`\\b${phrase.toLowerCase()}\\b`);
                return regex.test(text);
            });
            if (exactMatches.length > 0) {
                score += 0.4;
            }
        }
        
        // Check phrase matches (high weight)
        if (patterns.phrases) {
            maxPossible += 0.3;
            const phraseMatches = patterns.phrases.filter(phrase => text.includes(phrase.toLowerCase()));
            score += (phraseMatches.length / patterns.phrases.length) * 0.3;
        }
        
        // Check keyword matches (medium weight)
        if (patterns.keywords) {
            maxPossible += 0.2;
            const keywordMatches = patterns.keywords.filter(keyword => 
                words.includes(keyword) || text.includes(keyword)
            );
            score += (keywordMatches.length / patterns.keywords.length) * 0.2;
        }
        
        // Check question patterns (bonus)
        if (patterns.questions) {
            maxPossible += 0.1;
            const questionMatches = patterns.questions.filter(q => text.includes(q.toLowerCase()));
            score += (questionMatches.length / patterns.questions.length) * 0.1;
        }
        
        return maxPossible > 0 ? score : 0;
    }
    
    /**
     * Get matched patterns for debugging
     */
    getMatchedPatterns(text, words, patterns) {
        const matches = [];
        
        if (patterns.exact) {
            const exactMatches = patterns.exact.filter(phrase => text.includes(phrase.toLowerCase()));
            exactMatches.forEach(match => matches.push(`exact:"${match}"`));
        }
        
        if (patterns.phrases) {
            const phraseMatches = patterns.phrases.filter(phrase => text.includes(phrase.toLowerCase()));
            phraseMatches.forEach(match => matches.push(`phrase:"${match}"`));
        }
        
        if (patterns.keywords) {
            const keywordMatches = patterns.keywords.filter(keyword => 
                words.includes(keyword) || text.includes(keyword)
            );
            keywordMatches.forEach(match => matches.push(`keyword:"${match}"`));
        }
        
        return matches;
    }
    
    /**
     * Get question indicators found in text
     */
    getQuestionIndicators(text, words) {
        const indicators = [];
        
        if (text.endsWith('?')) indicators.push('question_mark');
        
        const questionWordsFound = words.filter(word => this.questionWords.includes(word));
        if (questionWordsFound.length > 0) {
            indicators.push(`question_words:${questionWordsFound.join(',')}`);
        }
        
        return indicators;
    }
}

// Export singleton instance
export const intentClassifier = new EnhancedIntentClassifier();