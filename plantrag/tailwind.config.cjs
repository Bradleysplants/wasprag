// tailwind.config.cjs

const { resolveProjectPath } = require('wasp/dev')

module.exports = {
    content: [resolveProjectPath('./src/**/*.{js,jsx,ts,tsx}')],
    plugins: [
      require('@tailwindcss/forms'),
      require('@tailwindcss/typography'),
      require('@tailwindcss/aspect-ratio'),
    ],
    important: true,
    theme: {
      extend: {
      colors: {
        // Greens - Our stars!
        'plant-primary': '#4CAF50', // A friendly, vibrant leaf green
        'plant-primary-dark': '#388E3C', // A deeper shade for contrast/hover
        'plant-secondary': '#8BC34A', // A lighter, zestier lime green
        'plant-subtle': '#DCEDC8', // Very light green, like new sprouts, for backgrounds



        // Earth Tones - Grounding elements
        'earth-brown': '#795548', // A nice soil/bark brown
        'earth-tan': '#D2B48C', // A lighter tan/beige, like dry earth or parchment



        // Accent - A pop of sunshine or berry!
        'accent-sun': '#FFC107', // Bright yellow, like a sunflower



        'accent-berry': '#E91E63', // Optional: A berry pink/red if you need more pop

        // Neutrals - Keeping it clean and readable
        'neutral-light': '#F5F5F5', // Soft off-white, slightly warm
        'neutral-medium': '#757575', // Readable gray for text
        'neutral-dark': '#333333', // Dark charcoal for headings/important text
      },
      fontFamily: {
       'sans': ['"Nunito Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      'display': ['"Nunito Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      spacing: {
        'section-gap': '4rem',
        'element-gap': '1.5rem',
      },
      borderRadius: {
        'lg': '0.75rem',
        'xl': '1rem',
      },
      boxShadow: {
        'subtle': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)', // Softer shadow
        'lifted': '0 10px 15px -3px rgba(0, 0, 0, 0.07), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', // A bit more pronounced
        keyframes: {
          // Define keyframes for a fade-in and slide-up effect
          'fade-slide-in': {
            'from': {
              opacity: '0',
              // Start slightly lower (adjust Y value as needed)
              transform: 'translateY(10px)'
            },
            'to': {
              opacity: '1',
              transform: 'translateY(0)'
            }
          },
          'fade-slide-in-content': {
            '0%': { opacity: '0', transform: 'translateY(5px)' }, // Start invisible and slightly down
            '30%': { opacity: '0', transform: 'translateY(5px)' }, // *Stay invisible for a bit to create delay*
            '100%': { opacity: '1', transform: 'translateY(0)' } // Fade and slide in
          }
        },
        animation: {
          // Create a utility class 'animate-fade-slide-in'
          // Format: 'name duration timing-function fill-mode'
          'fade-slide-in': 'fade-slide-in 0.3s ease-out forwards',
          'fade-slide-in-content': 'fade-slide-in-content 0.4s ease-out forwards',  
        }
  
      }
       // Add custom animations (leaf rustling? 😉) or other tweaks here!
    },
  }
}