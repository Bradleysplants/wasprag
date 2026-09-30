// src/server/utils/debug/ragDebugSuite.js - COMPLETE DEBUG & TEST IMPLEMENTATION
// Comprehensive testing suite to validate RAG pipeline data flow

import { ragPipeline } from './ragPipeline.js';
import { generatePlantCareResponse } from './plantCareUtils.js';
import { generateText, testLLM, healthCheck } from './llm/llmService.js';
import { reliablePlantAPI } from './plantAPIs.js';

// Comprehensive test data for validation
const TEST_DATA = {
  // Mock context data that mimics API responses
  mockContextData: [
    {
      id: 'test_monstera_1',
      name: 'Monstera deliciosa',
      scientificName: 'Monstera deliciosa',
      family: 'Araceae',
      source: 'TEST_PERENUAL_API',
      description: 'Popular tropical climbing plant known for its split leaves and easy care requirements.',
      watering: 'Water when top 2 inches of soil are dry, typically every 7-10 days. Ensure excellent drainage to prevent root rot.',
      light: 'Bright indirect light. Can tolerate some direct morning light but avoid harsh afternoon sun which can scorch leaves.',
      sunlight: 'Bright indirect light preferred',
      soil: 'Well-draining potting mix rich in organic matter. Aroid mix with perlite and bark works excellently.',
      humidity: 'Prefers 40-60% humidity. Use humidifier, pebble tray, or group with other plants.',
      temperature: 'Ideal range 65-80°F (18-27°C). Protect from cold drafts and temperatures below 60°F.',
      fertilizer: 'Feed monthly during growing season (spring/summer) with balanced liquid fertilizer diluted to half strength.',
      repotting: 'Repot every 1-2 years or when roots emerge from drainage holes. Spring is the best time.',
      toxicity: 'Toxic to pets and humans if ingested due to calcium oxalate crystals.',
      commonIssues: 'Yellowing leaves from overwatering, brown leaf tips from low humidity, spider mites in dry conditions.',
      careInfo: 'Monstera deliciosa is relatively easy to care for. Provide climbing support for larger leaves with fenestrations (splits). Wipe leaves regularly to maintain photosynthesis.',
      botanicalContext: 'Native to tropical rainforests of Central America. Epiphytic climber that develops aerial roots.',
      confidence: 0.95,
      growthRate: 'Moderate to fast',
      indoor: true
    },
    {
      id: 'test_snake_plant_1',
      name: 'Snake Plant',
      scientificName: 'Sansevieria trifasciata',
      family: 'Asparagaceae',
      source: 'TEST_GBIF_API',
      description: 'Extremely hardy succulent plant with upright sword-like leaves. Perfect for beginners.',
      watering: 'Water deeply but infrequently. Allow soil to dry completely between waterings, typically every 2-4 weeks.',
      light: 'Tolerates low light but prefers bright, indirect light. Can handle some direct sun.',
      soil: 'Well-draining succulent or cactus mix. Regular potting soil with added perlite works too.',
      humidity: 'Low humidity preferred. Thrives in typical home humidity levels.',
      temperature: 'Tolerates wide range 60-85°F (15-29°C). Can handle brief temperature drops.',
      fertilizer: 'Feed sparingly 2-3 times during growing season with diluted liquid fertilizer.',
      repotting: 'Repot only when severely pot-bound, typically every 3-5 years.',
      toxicity: 'Mildly toxic to pets if ingested in large quantities.',
      commonIssues: 'Root rot from overwatering, mushy leaves indicate too much moisture.',
      careInfo: 'Snake plants are nearly indestructible. They prefer neglect over too much attention. Excellent air purifiers.',
      botanicalContext: 'Native to West Africa. Drought-adapted succulent that stores water in thick leaves.',
      confidence: 0.9,
      growthRate: 'Slow',
      indoor: true,
      drought_tolerant: true
    }
  ],

  // Test queries of different types
  testQueries: [
    {
      query: "How often should I water my Monstera?",
      plants: ["Monstera deliciosa"],
      expectedCareType: "watering",
      expectedContextUsage: true
    },
    {
      query: "What kind of light does a Snake Plant need?",
      plants: ["Snake Plant"],
      expectedCareType: "lighting",
      expectedContextUsage: true
    },
    {
      query: "My Monstera leaves are turning yellow, what's wrong?",
      plants: ["Monstera deliciosa"],
      expectedCareType: "troubleshooting",
      expectedContextUsage: true
    },
    {
      query: "How do I care for my houseplants?",
      plants: [],
      expectedCareType: "general",
      expectedContextUsage: false
    }
  ]
};

// Test result tracker
class TestResultTracker {
  constructor() {
    this.results = [];
    this.summary = {
      total: 0,
      passed: 0,
      failed: 0,
      warnings: 0
    };
  }

  addResult(testName, passed, details = {}, warnings = []) {
    const result = {
      testName,
      passed,
      details,
      warnings,
      timestamp: new Date().toISOString()
    };
    
    this.results.push(result);
    this.summary.total++;
    
    if (passed) {
      this.summary.passed++;
    } else {
      this.summary.failed++;
    }
    
    this.summary.warnings += warnings.length;
    
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const warningText = warnings.length > 0 ? ` (${warnings.length} warnings)` : '';
    
    console.log(`${status} ${testName}${warningText}`);
    
    if (warnings.length > 0) {
      warnings.forEach(warning => console.warn(`  ⚠️  ${warning}`));
    }
    
    if (!passed && details.reason) {
      console.error(`  ❌ Reason: ${details.reason}`);
    }
    
    return result;
  }

  getReport() {
    const successRate = ((this.summary.passed / this.summary.total) * 100).toFixed(1);
    
    return {
      summary: {
        ...this.summary,
        successRate: `${successRate}%`
      },
      results: this.results,
      recommendations: this.generateRecommendations()
    };
  }

  generateRecommendations() {
    const recommendations = [];
    const failedTests = this.results.filter(r => !r.passed);
    
    if (failedTests.some(t => t.testName.includes('LLM'))) {
      recommendations.push('Check LLM configuration and connectivity');
    }
    
    if (failedTests.some(t => t.testName.includes('Context'))) {
      recommendations.push('Verify API data is being fetched and formatted correctly');
    }
    
    if (failedTests.some(t => t.testName.includes('Response'))) {
      recommendations.push('Review prompt construction and response cleaning logic');
    }
    
    if (this.summary.warnings > this.summary.passed) {
      recommendations.push('High warning count indicates potential quality issues');
    }
    
    return recommendations;
  }
}

// Main debug and test suite
class RAGDebugSuite {
  constructor() {
    this.tracker = new TestResultTracker();
    this.testData = TEST_DATA;
  }

  async runFullTestSuite() {
    console.log('🧪 [RAG DEBUG SUITE] Starting comprehensive test suite...\n');
    console.log('=' .repeat(80));
    
    try {
      // Test 1: Basic LLM connectivity
      await this.testLLMConnectivity();
      
      // Test 2: API data fetching
      await this.testAPIDataFetching();
      
      // Test 3: Context data validation
      await this.testContextDataValidation();
      
      // Test 4: Prompt construction
      await this.testPromptConstruction();
      
      // Test 5: Response generation with context
      await this.testResponseGeneration();
      
      // Test 6: End-to-end pipeline
      await this.testEndToEndPipeline();
      
      // Test 7: Response quality validation
      await this.testResponseQuality();
      
      // Generate final report
      const report = this.generateFinalReport();
      
      return report;
      
    } catch (error) {
      console.error('❌ [RAG DEBUG SUITE] Test suite failed:', error.message);
      throw error;
    }
  }

  async testLLMConnectivity() {
    console.log('\n🔌 [TEST 1] LLM Connectivity Test');
    console.log('-'.repeat(40));
    
    try {
      const healthResult = await healthCheck();
      const llmTest = await testLLM();
      
      const passed = healthResult.service === 'healthy' && llmTest.success;
      const warnings = [];
      
      if (healthResult.service === 'degraded') {
        warnings.push('LLM service is degraded but functional');
      }
      
      if (!llmTest.expectedResponse) {
        warnings.push('LLM response format unexpected');
      }
      
      this.tracker.addResult('LLM Connectivity', passed, {
        healthStatus: healthResult.service,
        testSuccess: llmTest.success,
        provider: llmTest.provider,
        responseTime: llmTest.duration
      }, warnings);
      
      console.log(`   Health Status: ${healthResult.service}`);
      console.log(`   Test Response: "${llmTest.response?.substring(0, 50)}..."`);
      console.log(`   Response Time: ${llmTest.duration}ms`);
      
    } catch (error) {
      this.tracker.addResult('LLM Connectivity', false, {
        error: error.message,
        reason: 'LLM test failed'
      });
    }
  }

  async testAPIDataFetching() {
    console.log('\n🌐 [TEST 2] API Data Fetching Test');
    console.log('-'.repeat(40));
    
    try {
      const testPlant = 'monstera';
      console.log(`   Testing API search for: "${testPlant}"`);
      
      const apiResults = await reliablePlantAPI.searchAllAPIs(testPlant, 10000);
      
      const passed = apiResults && apiResults.length > 0;
      const warnings = [];
      
      if (apiResults.length === 0) {
        warnings.push('No API results returned - check API configurations');
      } else if (apiResults.length < 3) {
        warnings.push('Low number of API results - some APIs may be failing');
      }
      
      // Check data quality
      let goodQualityResults = 0;
      apiResults.forEach(result => {
        const hasCareData = !!(result.watering || result.light || result.soil || result.careInfo);
        if (hasCareData) goodQualityResults++;
      });
      
      if (goodQualityResults === 0) {
        warnings.push('No results contain care data');
      } else if (goodQualityResults < apiResults.length * 0.5) {
        warnings.push('Many results lack care data');
      }
      
      this.tracker.addResult('API Data Fetching', passed, {
        totalResults: apiResults.length,
        qualityResults: goodQualityResults,
        sources: [...new Set(apiResults.map(r => r.source))]
      }, warnings);
      
      console.log(`   Results Found: ${apiResults.length}`);
      console.log(`   Quality Results: ${goodQualityResults}`);
      console.log(`   Sources: [${[...new Set(apiResults.map(r => r.source))].join(', ')}]`);
      
    } catch (error) {
      this.tracker.addResult('API Data Fetching', false, {
        error: error.message,
        reason: 'API search failed'
      });
    }
  }

  async testContextDataValidation() {
    console.log('\n📋 [TEST 3] Context Data Validation Test');
    console.log('-'.repeat(40));
    
    try {
      const mockData = this.testData.mockContextData;
      
      // Test with mock data to ensure validation logic works
      let validItems = 0;
      let totalCareFields = 0;
      
      mockData.forEach(item => {
        const careFields = ['watering', 'light', 'soil', 'humidity', 'temperature', 'fertilizer', 'careInfo'];
        const availableFields = careFields.filter(field => 
          item[field] && typeof item[field] === 'string' && item[field].length > 10
        );
        
        if (availableFields.length > 0) {
          validItems++;
          totalCareFields += availableFields.length;
        }
      });
      
      const avgCareFields = totalCareFields / mockData.length;
      const passed = validItems === mockData.length && avgCareFields >= 3;
      const warnings = [];
      
      if (avgCareFields < 5) {
        warnings.push('Average care fields per item is low');
      }
      
      this.tracker.addResult('Context Data Validation', passed, {
        totalItems: mockData.length,
        validItems: validItems,
        avgCareFields: avgCareFields.toFixed(1)
      }, warnings);
      
      console.log(`   Total Items: ${mockData.length}`);
      console.log(`   Valid Items: ${validItems}`);
      console.log(`   Avg Care Fields: ${avgCareFields.toFixed(1)}`);
      
    } catch (error) {
      this.tracker.addResult('Context Data Validation', false, {
        error: error.message,
        reason: 'Context validation failed'
      });
    }
  }

  async testPromptConstruction() {
    console.log('\n📝 [TEST 4] Prompt Construction Test');
    console.log('-'.repeat(40));
    
    try {
      const testQuery = this.testData.testQueries[0];
      const contextData = [this.testData.mockContextData[0]];
      
      // Import the prompt builder from plantCareUtils
      const { buildPlantCarePrompt } = await import('./plantCareUtils.js');
      
      const prompt = buildPlantCarePrompt(testQuery.query, testQuery.plants, contextData);
      
      const passed = prompt && prompt.length > 500;
      const warnings = [];
      
      // Check prompt content
      const hasContext = prompt.includes('DATABASE') || prompt.includes('CONTEXT');
      const hasInstructions = prompt.includes('MUST') || prompt.includes('CRITICAL');
      const hasPlantName = testQuery.plants.some(plant => prompt.includes(plant));
      
      if (!hasContext) warnings.push('Prompt may not include context section');
      if (!hasInstructions) warnings.push('Prompt may lack clear instructions');
      if (!hasPlantName) warnings.push('Prompt may not mention target plant');
      
      // Check if context data appears in prompt
      const contextItem = contextData[0];
      const hasWateringInfo = contextItem.watering && prompt.includes(contextItem.watering.substring(0, 20));
      const hasSourceInfo = contextItem.source && prompt.includes(contextItem.source);
      
      if (!hasWateringInfo) warnings.push('Context watering info not found in prompt');
      if (!hasSourceInfo) warnings.push('Context source info not found in prompt');
      
      this.tracker.addResult('Prompt Construction', passed, {
        promptLength: prompt.length,
        hasContext: hasContext,
        hasInstructions: hasInstructions,
        hasPlantName: hasPlantName,
        hasContextData: hasWateringInfo && hasSourceInfo
      }, warnings);
      
      console.log(`   Prompt Length: ${prompt.length} characters`);
      console.log(`   Has Context Section: ${hasContext}`);
      console.log(`   Has Instructions: ${hasInstructions}`);
      console.log(`   Context Data Present: ${hasWateringInfo && hasSourceInfo}`);
      
      // Log a sample of the prompt for manual inspection
      console.log(`   Sample: "${prompt.substring(0, 200)}..."`);
      
    } catch (error) {
      this.tracker.addResult('Prompt Construction', false, {
        error: error.message,
        reason: 'Prompt construction failed'
      });
    }
  }

  async testResponseGeneration() {
    console.log('\n🤖 [TEST 5] Response Generation Test');
    console.log('-'.repeat(40));
    
    try {
      const testQuery = this.testData.testQueries[0]; // Monstera watering question
      const contextData = [this.testData.mockContextData[0]]; // Monstera context
      
      console.log(`   Query: "${testQuery.query}"`);
      console.log(`   Plants: [${testQuery.plants.join(', ')}]`);
      console.log(`   Context Items: ${contextData.length}`);
      
      const response = await generatePlantCareResponse(testQuery.query, testQuery.plants, contextData);
      
      const passed = response && response.length > 50;
      const warnings = [];
      
      if (!response) {
        this.tracker.addResult('Response Generation', false, {
          reason: 'No response generated'
        });
        return;
      }
      
      // Analyze response content
      const responseLower = response.toLowerCase();
      
      // Check for plant-specific content
      const mentionsPlant = testQuery.plants.some(plant => 
        responseLower.includes(plant.toLowerCase())
      );
      
      // Check for watering-specific content (since it's a watering question)
      const hasWateringContent = ['water', 'soil', 'dry', 'moist', 'drainage'].some(term => 
        responseLower.includes(term)
      );
      
      // Check for context usage
      const contextItem = contextData[0];
      const usesContextData = [
        contextItem.watering?.substring(0, 20).toLowerCase(),
        contextItem.source?.toLowerCase(),
        'database', 'api'
      ].some(term => term && responseLower.includes(term));
      
      if (!mentionsPlant) warnings.push('Response may not mention target plant');
      if (!hasWateringContent) warnings.push('Response lacks watering-specific content');
      if (!usesContextData) warnings.push('Response may not use provided context');
      
      this.tracker.addResult('Response Generation', passed, {
        responseLength: response.length,
        mentionsPlant: mentionsPlant,
        hasWateringContent: hasWateringContent,
        usesContext: usesContextData
      }, warnings);
      
      console.log(`   Response Length: ${response.length} characters`);
      console.log(`   Mentions Plant: ${mentionsPlant}`);
      console.log(`   Has Watering Content: ${hasWateringContent}`);
      console.log(`   Uses Context: ${usesContextData}`);
      console.log(`   Sample: "${response.substring(0, 150)}..."`);
      
    } catch (error) {
      this.tracker.addResult('Response Generation', false, {
        error: error.message,
        reason: 'Response generation failed'
      });
    }
  }

  async testEndToEndPipeline() {
    console.log('\n🔄 [TEST 6] End-to-End Pipeline Test');
    console.log('-'.repeat(40));
    
    try {
      const testQuery = "How should I water my Snake Plant?";
      console.log(`   Testing full pipeline with: "${testQuery}"`);
      
      const pipelineResult = await ragPipeline.processQuery(testQuery);
      
      const passed = !!(pipelineResult && pipelineResult.answer && pipelineResult.answer.length > 50);
      const warnings = [];
      
      if (!pipelineResult) {
        this.tracker.addResult('End-to-End Pipeline', false, {
          reason: 'Pipeline returned no result'
        });
        return;
      }
      
      // Analyze pipeline result
      const hasAnswer = !!(pipelineResult.answer && pipelineResult.answer.length > 0);
      const hasSources = !!(pipelineResult.sources && pipelineResult.sources.length > 0);
      const hasType = !!pipelineResult.type;
      const hasReasoning = !!pipelineResult.reasoning;
      
      if (!hasAnswer) warnings.push('No answer provided');
      if (!hasSources) warnings.push('No sources provided');
      if (!hasType) warnings.push('No response type specified');
      if (!hasReasoning) warnings.push('No reasoning provided');
      
      // Check if it used enhanced data
      const usedEnhancedData = pipelineResult.type?.includes('enhanced') || 
                              pipelineResult.reasoning?.includes('API');
      
      if (!usedEnhancedData) warnings.push('May not have used enhanced API data');
      
      this.tracker.addResult('End-to-End Pipeline', passed, {
        hasAnswer: hasAnswer,
        answerLength: pipelineResult.answer?.length || 0,
        sourceCount: pipelineResult.sources?.length || 0,
        responseType: pipelineResult.type,
        usedEnhancedData: usedEnhancedData
      }, warnings);
      
      console.log(`   Answer Length: ${pipelineResult.answer?.length || 0} characters`);
      console.log(`   Sources: ${pipelineResult.sources?.length || 0}`);
      console.log(`   Response Type: ${pipelineResult.type || 'Unknown'}`);
      console.log(`   Used Enhanced Data: ${usedEnhancedData}`);
      
      if (pipelineResult.debug) {
        const debugSteps = pipelineResult.debug.steps?.length || 0;
        console.log(`   Debug Steps: ${debugSteps}`);
      }
      
    } catch (error) {
      this.tracker.addResult('End-to-End Pipeline', false, {
        error: error.message,
        reason: 'Pipeline execution failed'
      });
    }
  }

  async testResponseQuality() {
    console.log('\n⭐ [TEST 7] Response Quality Test');
    console.log('-'.repeat(40));
    
    try {
      const qualityTests = [];
      
      // Test multiple query types
      for (const testQuery of this.testData.testQueries.slice(0, 3)) {
        console.log(`   Testing: "${testQuery.query.substring(0, 40)}..."`);
        
        const contextData = testQuery.plants.length > 0 ? 
          [this.testData.mockContextData.find(item => 
            testQuery.plants.some(plant => item.name.includes(plant))
          )].filter(Boolean) : [];
        
        try {
          const response = await generatePlantCareResponse(testQuery.query, testQuery.plants, contextData);
          
          const qualityMetrics = this.analyzeResponseQuality(response, testQuery, contextData);
          qualityTests.push(qualityMetrics);
          
          console.log(`     Quality Score: ${qualityMetrics.score}/100`);
          
        } catch (error) {
          console.error(`     Failed: ${error.message}`);
          qualityTests.push({ score: 0, passed: false, error: error.message });
        }
      }
      
      const avgScore = qualityTests.reduce((sum, test) => sum + test.score, 0) / qualityTests.length;
      const passedTests = qualityTests.filter(test => test.passed).length;
      const passed = avgScore >= 60 && passedTests >= qualityTests.length * 0.6;
      
      const warnings = [];
      if (avgScore < 70) warnings.push('Average quality score is below optimal threshold');
      if (passedTests < qualityTests.length) warnings.push('Some quality tests failed');
      
      this.tracker.addResult('Response Quality', passed, {
        averageScore: avgScore.toFixed(1),
        passedTests: `${passedTests}/${qualityTests.length}`,
        qualityTests: qualityTests
      }, warnings);
      
      console.log(`   Average Quality Score: ${avgScore.toFixed(1)}/100`);
      console.log(`   Tests Passed: ${passedTests}/${qualityTests.length}`);
      
    } catch (error) {
      this.tracker.addResult('Response Quality', false, {
        error: error.message,
        reason: 'Quality testing failed'
      });
    }
  }

  analyzeResponseQuality(response, testQuery, contextData) {
    if (!response || typeof response !== 'string') {
      return { score: 0, passed: false, issues: ['No valid response'] };
    }
    
    const responseLower = response.toLowerCase();
    let score = 0;
    const issues = [];
    
    // Length check (20 points)
    if (response.length >= 100 && response.length <= 1000) {
      score += 20;
    } else if (response.length >= 50) {
      score += 10;
      if (response.length < 100) issues.push('Response quite short');
      if (response.length > 1000) issues.push('Response quite long');
    } else {
      issues.push('Response too short');
    }
    
    // Plant mention check (20 points)
    const mentionsPlant = testQuery.plants.length === 0 || 
      testQuery.plants.some(plant => responseLower.includes(plant.toLowerCase()));
    if (mentionsPlant) {
      score += 20;
    } else {
      issues.push('Does not mention target plant');
    }
    
    // Care type relevance (20 points)
    const careKeywords = {
      watering: ['water', 'moist', 'dry', 'soil', 'drainage'],
      lighting: ['light', 'sun', 'bright', 'indirect', 'shade'],
      troubleshooting: ['yellow', 'brown', 'problem', 'issue', 'dying']
    };
    
    const expectedKeywords = careKeywords[testQuery.expectedCareType] || [];
    const hasRelevantContent = expectedKeywords.some(keyword => responseLower.includes(keyword));
    if (hasRelevantContent) {
      score += 20;
    } else {
      issues.push(`Lacks ${testQuery.expectedCareType} content`);
    }
    
    // Context usage check (20 points)
    if (testQuery.expectedContextUsage && contextData.length > 0) {
      const contextUsageIndicators = [
        'database', 'api', 'according to', 'research', 'source'
      ];
      const hasContextUsage = contextUsageIndicators.some(indicator => 
        responseLower.includes(indicator)
      );
      
      if (hasContextUsage) {
        score += 20;
      } else {
        issues.push('May not use provided context');
      }
    } else if (!testQuery.expectedContextUsage) {
      score += 15; // Partial credit for not needing context
    }
    
    // Plant content richness (20 points)
    const plantKeywords = ['plant', 'care', 'grow', 'leaf', 'root', 'humidity', 'fertilizer'];
    const plantContentCount = plantKeywords.filter(keyword => responseLower.includes(keyword)).length;
    
    if (plantContentCount >= 4) {
      score += 20;
    } else if (plantContentCount >= 2) {
      score += 10;
    } else {
      issues.push('Lacks rich plant content');
    }
    
    return {
      score: Math.min(100, score),
      passed: score >= 60,
      issues: issues
    };
  }

  generateFinalReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 [FINAL REPORT] RAG Pipeline Test Results');
    console.log('='.repeat(80));
    
    const report = this.tracker.getReport();
    
    console.log(`\n📈 Test Summary:`);
    console.log(`   Total Tests: ${report.summary.total}`);
    console.log(`   Passed: ${report.summary.passed} ✅`);
    console.log(`   Failed: ${report.summary.failed} ❌`);
    console.log(`   Warnings: ${report.summary.warnings} ⚠️`);
    console.log(`   Success Rate: ${report.summary.successRate}`);
    
    console.log(`\n🔍 Test Details:`);
    report.results.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      console.log(`   ${status} ${result.testName}`);
      
      if (Object.keys(result.details).length > 0) {
        Object.entries(result.details).forEach(([key, value]) => {
          console.log(`      ${key}: ${value}`);
        });
      }
    });
    
    if (report.recommendations.length > 0) {
      console.log(`\n💡 Recommendations:`);
      report.recommendations.forEach(rec => {
        console.log(`   • ${rec}`);
      });
    }
    
    // Overall assessment
    const overallStatus = report.summary.passed === report.summary.total ? 'EXCELLENT' :
                         report.summary.successRate >= '80%' ? 'GOOD' :
                         report.summary.successRate >= '60%' ? 'FAIR' : 'NEEDS_WORK';
    
    console.log(`\n🎯 Overall Assessment: ${overallStatus}`);
    
    if (overallStatus === 'EXCELLENT') {
      console.log('   🎉 RAG pipeline is working correctly with data flow intact!');
    } else if (overallStatus === 'GOOD') {
      console.log('   👍 RAG pipeline is mostly working, minor issues to address.');
    } else if (overallStatus === 'FAIR') {
      console.log('   ⚠️  RAG pipeline has some issues that should be fixed.');
    } else {
      console.log('   🚨 RAG pipeline has significant issues that need immediate attention.');
    }
    
    console.log('\n' + '='.repeat(80));
    
    return {
      ...report,
      overallStatus,
      timestamp: new Date().toISOString()
    };
  }
}

// Quick test function for specific components
export async function quickTest(component = 'all') {
  console.log(`🚀 [QUICK TEST] Testing component: ${component}`);
  
  switch (component) {
    case 'llm':
      return await testLLM();
      
    case 'api':
      try {
        const results = await reliablePlantAPI.searchAllAPIs('monstera', 5000);
        console.log(`📊 API Test: ${results.length} results from APIs`);
        return { success: true, resultCount: results.length };
      } catch (error) {
        console.error(`❌ API Test failed: ${error.message}`);
        return { success: false, error: error.message };
      }
      
    case 'context':
      const mockData = TEST_DATA.mockContextData[0];
      const contextTest = await generatePlantCareResponse(
        "How do I water this plant?", 
        ["Monstera deliciosa"], 
        [mockData]
      );
      console.log(`📊 Context Test: ${contextTest.length} char response`);
      return { success: contextTest.length > 50, responseLength: contextTest.length };
      
    case 'pipeline':
      try {
        const result = await ragPipeline.processQuery("How do I care for my Snake Plant?");
        console.log(`📊 Pipeline Test: ${result.answer?.length || 0} char answer`);
        return { success: !!(result && result.answer), type: result.type };
      } catch (error) {
        console.error(`❌ Pipeline Test failed: ${error.message}`);
        return { success: false, error: error.message };
      }
      
    case 'all':
    default:
      const suite = new RAGDebugSuite();
      return await suite.runFullTestSuite();
  }
}

// Export main classes and functions
export { RAGDebugSuite, TestResultTracker, TEST_DATA };
export default RAGDebugSuite;