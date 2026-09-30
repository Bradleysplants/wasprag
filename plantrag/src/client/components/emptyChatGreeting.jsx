import React, { useState, useEffect } from 'react';

export const EmptyChatGreeting = ({ theme = 'light', isPaywallShowing = false }) => {
  const isDark = theme === 'dark';
  const [isLoaded, setIsLoaded] = useState(false);
  const [hoveredSuggestion, setHoveredSuggestion] = useState(null);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const suggestions = [
    { emoji: '🌿', text: 'How to care for a Pothos?', compact: 'Pothos care', color: 'from-green-400 to-emerald-500' },
    { emoji: '🍃', text: 'Why are my leaves turning yellow?', compact: 'Yellow leaves', color: 'from-emerald-400 to-teal-500' },
    { emoji: '🌱', text: 'Best plants for low light?', compact: 'Low light', color: 'from-teal-400 to-cyan-500' },
    { emoji: '🌾', text: 'Help identify my plant', compact: 'Identify plant', color: 'from-green-500 to-lime-500' }
  ];

  return (
    <div 
      className={`
        relative w-full overflow-hidden
        ${isPaywallShowing ? 'py-2 px-3' : 'py-3 px-4'}
        ${isDark ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900' : 'bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50'}
        transition-all duration-1000 ease-out
        flex flex-col justify-center min-h-0
      `}
    >
      
      {/* Simplified Background Elements - Only when not paywall */}
      {!isPaywallShowing && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(2)].map((_, i) => (
            <div
              key={i}
              className={`absolute w-0.5 h-0.5 rounded-full ${isDark ? 'bg-emerald-400/20' : 'bg-green-400/30'} 
                animate-pulse`}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            />
          ))}
        </div>
      )}

      {/* Main Content Container - Slightly more compact */}
      <div className={`
        relative z-10 max-w-md mx-auto text-center w-full
        transform transition-all duration-700 ease-out
        ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}
      `}>
        
        {/* Slightly smaller Hero Plant Illustration */}
        <div className={`relative ${isPaywallShowing ? 'mb-2' : 'mb-3'}`}>
          <div className={`
            relative mx-auto rounded-full
            ${isPaywallShowing ? 'w-8 h-8' : 'w-10 h-10'}
            ${isDark ? 'bg-gradient-to-br from-emerald-600/20 to-green-700/30' : 'bg-gradient-to-br from-green-100 to-emerald-200'}
            backdrop-blur-sm border border-white/20 shadow-md
            transform transition-all duration-500 hover:scale-110
            flex items-center justify-center
          `}>
            <span className={isPaywallShowing ? 'text-sm' : 'text-lg'}>🌿</span>
            
            {/* Minimal floating elements - only when not paywall */}
            {!isPaywallShowing && (
              <div className="absolute -top-1 -right-1">
                <span className="text-sm animate-bounce" style={{animationDelay: '0.5s'}}>🌱</span>
              </div>
            )}
          </div>
        </div>

        {/* Slightly more compact Main Heading */}
        <div className={isPaywallShowing ? 'mb-2' : 'mb-3'}>
          <h1 className={`
            font-bold bg-gradient-to-r bg-clip-text text-transparent
            ${isPaywallShowing ? 'text-lg md:text-xl mb-1' : 'text-xl md:text-2xl mb-1'}
            ${isDark ? 'from-emerald-400 to-green-400' : 'from-emerald-600 to-green-600'}
            transform transition-all duration-500
          `}>
            Let's Grow Together! 🌱
          </h1>
          <p className={`
            leading-tight max-w-sm mx-auto
            ${isPaywallShowing ? 'text-xs' : 'text-sm'}
            ${isDark ? 'text-slate-300' : 'text-slate-600'}
          `}>
            Your personal plant care assistant is here to help
          </p>
        </div>

        {/* Slightly more compact Suggestion Cards */}
        <div className={`
          grid gap-1.5 mb-2
          ${isPaywallShowing ? 'grid-cols-2' : 'grid-cols-2'}
        `}>
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className={`
                group relative overflow-hidden cursor-pointer
                ${isPaywallShowing ? 'rounded-lg p-2' : 'rounded-xl p-2.5'}
                ${isDark ? 'bg-slate-800/50 hover:bg-slate-700/60' : 'bg-white/70 hover:bg-white/90'}
                backdrop-blur-md border border-white/20 shadow-sm
                transform transition-all duration-300 hover:scale-105
                ${hoveredSuggestion === index ? 'shadow-lg' : ''}
              `}
              style={{
                transitionDelay: `${index * 50}ms`
              }}
              onMouseEnter={() => setHoveredSuggestion(index)}
              onMouseLeave={() => setHoveredSuggestion(null)}
            >
              {/* Subtle gradient on hover */}
              <div className={`
                absolute inset-0 bg-gradient-to-r ${suggestion.color} opacity-0 group-hover:opacity-10
                transition-opacity duration-300 rounded-xl
              `} />
              
              <div className={`
                relative flex items-center justify-center
                ${isPaywallShowing ? 'flex-col space-y-0.5' : 'flex-col space-y-1'}
              `}>
                <span className={`
                  transform transition-transform duration-300 group-hover:scale-110
                  ${isPaywallShowing ? 'text-base' : 'text-lg'}
                `}>
                  {suggestion.emoji}
                </span>
                <span className={`
                  font-medium transition-colors duration-300 text-center
                  ${isPaywallShowing ? 'text-xs leading-tight' : 'text-sm leading-tight'}
                  ${isDark ? 'text-slate-200 group-hover:text-white' : 'text-slate-700 group-hover:text-slate-900'}
                `}>
                  {isPaywallShowing ? suggestion.compact : suggestion.text}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Slightly more compact Call to Action */}
        <div className={`
          inline-flex items-center space-x-2 rounded-full
          ${isPaywallShowing ? 'px-3 py-1' : 'px-3 py-1.5'}
          ${isDark ? 'bg-emerald-600/20 border-emerald-500/30' : 'bg-emerald-100/70 border-emerald-300/50'}
          border backdrop-blur-sm shadow-sm
          transform transition-all duration-300 hover:scale-105
        `}>
          <div className="flex -space-x-0">
            <span className={`animate-pulse ${isPaywallShowing ? 'text-xs' : 'text-sm'}`}>🌿</span>
            <span className={`animate-pulse ${isPaywallShowing ? 'text-xs' : 'text-sm'}`} style={{animationDelay: '0.2s'}}>🌱</span>
          </div>
          <span className={`
            font-medium
            ${isPaywallShowing ? 'text-xs' : 'text-sm'}
            ${isDark ? 'text-emerald-300' : 'text-emerald-700'}
          `}>
            {isPaywallShowing ? 'Start now!' : 'Type a message to start!'}
          </span>
        </div>
      </div>
    </div>
  );
};