// tailwind.config.cjs

const { resolveProjectPath } = require('wasp/dev')

module.exports = {
    content: [resolveProjectPath('./src/**/*.{js,jsx,ts,tsx}')],
    darkMode: 'class', // Moved darkMode to root level
    plugins: [
      require('@tailwindcss/forms'),
      require('@tailwindcss/typography'),
      require('@tailwindcss/aspect-ratio'),
    ],
    important: true,
    theme: {
      extend: {
        colors: {
          // Plant Colors - Your star greens! (now using CSS variables)
          'plant-primary': 'rgb(var(--color-plant-primary) / <alpha-value>)',
          'plant-primary-dark': 'rgb(var(--color-plant-primary-dark) / <alpha-value>)', 
          'plant-secondary': 'rgb(var(--color-plant-secondary) / <alpha-value>)',
          'plant-subtle': 'rgb(var(--color-plant-subtle) / <alpha-value>)',

          // Earth Tones - Grounding elements
          'earth-brown': 'rgb(var(--color-earth-brown) / <alpha-value>)',
          'earth-tan': 'rgb(var(--color-earth-tan) / <alpha-value>)',

          // Accents - Sunshine and berry!
          'accent-sun': 'rgb(var(--color-accent-sun) / <alpha-value>)',
          'accent-berry': 'rgb(var(--color-accent-berry) / <alpha-value>)',

          // Neutrals - Clean and readable
          'neutral-light': 'rgb(var(--color-neutral-light) / <alpha-value>)',
          'neutral-medium': 'rgb(var(--color-neutral-medium) / <alpha-value>)',
          'neutral-dark': 'rgb(var(--color-neutral-dark) / <alpha-value>)',

          // Semantic colors for easy theming
          background: {
            primary: 'rgb(var(--color-bg-primary) / <alpha-value>)',
            secondary: 'rgb(var(--color-bg-secondary) / <alpha-value>)',
            tertiary: 'rgb(var(--color-bg-tertiary) / <alpha-value>)',
          },
          
          text: {
            primary: 'rgb(var(--color-text-primary) / <alpha-value>)',
            secondary: 'rgb(var(--color-text-secondary) / <alpha-value>)',
            tertiary: 'rgb(var(--color-text-tertiary) / <alpha-value>)',
            inverse: 'rgb(var(--color-text-inverse) / <alpha-value>)',
          },
          
          border: {
            primary: 'rgb(var(--color-border-primary) / <alpha-value>)',
            secondary: 'rgb(var(--color-border-secondary) / <alpha-value>)',
          },
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
          'subtle': 'rgb(var(--shadow-subtle))',
          'lifted': 'rgb(var(--shadow-lifted))',
        },
        
        keyframes: {
          'fade-slide-in': {
            'from': {
              opacity: '0',
              transform: 'translateY(10px)'
            },
            'to': {
              opacity: '1',
              transform: 'translateY(0)'
            }
          },
          'fade-slide-in-content': {
            '0%': { opacity: '0', transform: 'translateY(5px)' },
            '30%': { opacity: '0', transform: 'translateY(5px)' },
            '100%': { opacity: '1', transform: 'translateY(0)' }
          }
        },
        
        animation: {
          'fade-slide-in': 'fade-slide-in 0.3s ease-out forwards',
          'fade-slide-in-content': 'fade-slide-in-content 0.4s ease-out forwards',  
        }
      }
    }
}