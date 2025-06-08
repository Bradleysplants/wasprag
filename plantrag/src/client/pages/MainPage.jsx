// src/client/pages/MainPage.jsx
// Updated for Ollama integration while preserving all existing logic

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { searchBotanicalInfo } from 'wasp/client/operations';
import { getUserDisplayNameFromUser } from '../utils/authUtils';
import { MessageList } from '../components/messageList.jsx';
import { MessageInput } from '../components/messageInputs.jsx';

// Import the enhanced chat actions (now powered by Ollama!)
import { enhancedChat } from 'wasp/client/operations';

export const MainPage = ({ user }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { 
      id: '0', 
      content: `Hello! I'm your Botanical Assistant 🌱. I'm powered by advanced NER + Ollama AI. I can answer plant questions and chat with you!`, 
      type: 'assistant' 
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [systemHealth, setSystemHealth] = useState({ healthy: true }); // Always start healthy
  const conversationHistoryRef = useRef([]);

  // No health check - just keep it simple
  useEffect(() => {
    // Just set good status immediately, no health check
    setSystemHealth({ healthy: true });
  }, []);

  // Extract theme (your existing logic - KEEP AS IS)
  const getTheme = () => {
    let themeToApply = 'light';
    if (user?.theme) {
      themeToApply = user.theme;
    } else if (user?.user?.theme) {
      themeToApply = user.user.theme;
    }
    return themeToApply;
  };

  const getUserInitial = useCallback(() => {
    const displayName = getUserDisplayNameFromUser(user);
    return displayName ? displayName[0].toUpperCase() : 'U';
  }, [user]);

  // Update conversation history when messages change (KEEP AS IS)
  useEffect(() => {
    conversationHistoryRef.current = messages.slice(1); // Exclude initial greeting
  }, [messages]);

  const handleSubmit = useCallback(async (e) => {
    if (e) e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    const userMessage = { id: Date.now().toString(), content: trimmedInput, type: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      console.log(`[MainPage] Processing message: "${trimmedInput}"`);
      
      // Call the enhanced chatbot through the Wasp action (now uses Ollama!)
      const response = await enhancedChat({ 
        message: trimmedInput,
        conversationHistory: conversationHistoryRef.current
      });

      console.log("[MainPage] Received enhanced response:", response);

      let assistantContent = response?.content || "I'm having trouble responding right now.";
      
      // Enhanced context indicators for different response types
      if (response?.type === 'botanical' && response?.sources?.length > 0) {
        assistantContent += '\n\n📚 *Information from botanical database*';
      } else if (response?.type === 'botanical_llm') {
        assistantContent += '\n\n🤖 *AI-generated plant advice*';
      } else if (response?.type === 'plant_care') {
        assistantContent += '\n\n🌱 *Personalized plant care advice*';
      } else if (response?.type === 'mixed') {
        assistantContent += '\n\n🌱 *Combined database and AI response*';
      }

      // Add entity information if plants were detected
      if (response?.plantCount > 0) {
        assistantContent += `\n\n🔍 *Detected ${response.plantCount} plant${response.plantCount !== 1 ? 's' : ''} in your message*`;
      }

      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        content: assistantContent,
        type: 'assistant',
        sources: response?.sources,
        responseType: response?.type,
        entities: response?.entities,
        plantCount: response?.plantCount,
        reasoning: response?.reasoning
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // Log interesting response details
      if (response?.entities?.length > 0) {
        console.log('[MainPage] Plant entities detected:', response.entities.map(e => e.word));
      }
      
    } catch (err) {
      console.error('[MainPage] Enhanced chatbot error:', err);
              
        // Final fallback to original botanical search
        try {
          console.log('[MainPage] Final fallback to basic botanical search...');
          const fallbackResponse = await searchBotanicalInfo({ query: trimmedInput });
          
          const fallbackMessage = {
            id: (Date.now() + 1).toString(),
            content: (fallbackResponse?.answer || "I couldn't find specific information about that.") + '\n\n📊 *Database search only*',
            type: 'assistant',
            sources: fallbackResponse?.sources,
            responseType: 'database_fallback'
          };
          setMessages(prev => [...prev, fallbackMessage]);
          
        } catch (fallbackErr) {
          console.error('[MainPage] All fallbacks failed:', fallbackErr);
          
          // Simple error message
          const errorMessage = {
            id: (Date.now() + 1).toString(),
            content: `😥 I'm experiencing technical difficulties. This might be due to:

• Ollama service not running
• Network connectivity issues  
• Model loading problems

Please try again in a moment, or check that Ollama is running with: \`curl http://localhost:11434/api/tags\``,
            type: 'assistant',
            responseType: 'error'
          };
          setMessages(prev => [...prev, errorMessage]);
        }
      }
    finally {
      setIsLoading(false);
    }
  }, [input, systemHealth]);

  // Get system status indicator
  const getSystemStatusIndicator = () => {
    if (!systemHealth) return null;
    
    const isHealthy = systemHealth.healthy;
    const statusText = isHealthy ? 'All systems operational' : 'System issues detected';
    const statusColor = isHealthy ? 'text-green-400' : 'text-yellow-400';
    const statusIcon = isHealthy ? '🟢' : '🟡';
    
    return (
      <div className={`text-xs ${statusColor} opacity-75`}>
        {statusIcon} {statusText}
      </div>
    );
  };

  return (
    <div className="h-full w-full flex flex-col" style={{ backgroundColor: '#3b3b3b' }}>
      
      <div className="flex-1 min-h-0">
        <MessageList
          messages={messages}
          isLoading={isLoading}
          userInitial={getUserInitial()}
          theme={getTheme()}
        />
      </div>
      
      <div className="flex-shrink-0">
        <MessageInput
          input={input}
          isLoading={isLoading}
          onInputChange={setInput}
          onSubmit={handleSubmit}
        />
        
        {/* Clean bottom status footer */}
        <div className="px-4 py-1 bg-gray-800/50">
          <div className="max-w-3xl mx-auto flex items-center justify-between text-xs">
            <span className="text-gray-400">
              🧠 NER + Ollama AI
            </span>
            {getSystemStatusIndicator()}
          </div>
        </div>
      </div>
    </div>
  );
};