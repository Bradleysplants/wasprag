// src/client/components/Footer.jsx

import React from 'react';
// Optional: If you have an icon library (like react-icons, heroicons) or SVGs,
// you could import specific icons here. For example:
// import { SiGithub } from "@icons-pack/react-simple-icons"; // Example using react-simple-icons
// import { LinkIcon } from '@heroicons/react/20/solid'; // Example using heroicons

export const Footer = () => {
  // Get the current year dynamically
  const currentYear = new Date().getFullYear();

  return (
    // Use the semantic <footer> element
    // Slightly more padding, slightly less transparent background, slightly stronger border
    <footer className="bg-plant-subtle/70 border-t border-plant-primary/20 mt-auto py-4">
      {/* Container to constrain width and manage padding */}
      <div className="container mx-auto px-4 sm:px-6">
        {/* Flex container for alignment */}
        {/* - Arranges items in a column on small screens, row on larger screens */}
        {/* - Justifies content between ends on larger screens */}
        {/* - Centers items vertically */}
        {/* - Adds vertical space on small screens, none on larger */}
        <div className="flex flex-col sm:flex-row justify-between items-center text-center sm:text-left space-y-2 sm:space-y-0">

          {/* Left Side: Copyright & Disclaimer */}
          {/* Uses theme text color, small size */}
          <p className="text-neutral-medium text-xs">
            © {currentYear} Botanical Assistant. AI advice requires verification. 💚
          </p>

          {/* Right Side: Optional Links Section */}
          {/* Uses flex to arrange links horizontally, adds spacing */}
          <div className="flex items-center space-x-4">
            {/* Link to GitHub Repository */}
            <a
              // --- Replace YOUR_GITHUB_REPO_URL with your actual repository link ---
              href="https://github.com/your-username/your-repo-name"
              // --- End Replacement ---
              target="_blank" // Open in new tab
              rel="noopener noreferrer" // Security best practice for target="_blank"
              // Styling: theme colors, hover effects, transitions
              className="text-xs text-plant-primary-dark hover:text-plant-primary hover:underline transition-colors duration-150"
              aria-label="View source code on GitHub" // Accessibility label
            >
              {/* --- Optional Icon Example (requires installation and import) --- */}
              {/* <SiGithub className="inline h-3 w-3 mr-1" /> */}
              {/* --- End Optional Icon --- */}
              Source Code
            </a>

            {/* Link to Trefle API Website */}
            <a
              href="https://trefle.io" // Direct link to Trefle
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-plant-primary-dark hover:text-plant-primary hover:underline transition-colors duration-150"
              aria-label="Trefle Plant API website"
            >
              {/* --- Optional Icon Example (requires installation and import) --- */}
              {/* <LinkIcon className="inline h-3 w-3 mr-1" /> */}
              {/* --- End Optional Icon --- */}
              Trefle API
            </a>
          </div>

        </div>
      </div>
    </footer>
  );
};

// If using React.memo for optimization (optional, usually not needed for simple footers)
// export const MemoizedFooter = React.memo(Footer);