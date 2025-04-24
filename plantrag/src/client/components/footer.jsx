// src/client/components/Footer.jsx
import React from 'react';

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-plant-subtle/50 border-t border-plant-primary/10 mt-auto">
      <div className="container mx-auto px-4 sm:px-6 py-3">
        <p className="text-center text-neutral-medium text-xs">
          © {currentYear} Botanical Assistant. AI-generated advice, please verify critical information independently. 💚
        </p>
      </div>
    </footer>
  );
};