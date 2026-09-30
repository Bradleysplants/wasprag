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
    <footer className="bg-plant-subtle/70 border-t border-plant-primary/20 mt-auto py-3">
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
            © {currentYear} Botani-Buddy. AI advice requires verification. 💚
          </p>
        </div>
      </div>
    </footer>
  );
};