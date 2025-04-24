// src/SignupPage.jsx
import React from 'react';
import { Link } from 'react-router-dom'
import { SignupForm } from 'wasp/client/auth'

export const SignupPage = () => {
  return (
    <div style={{ maxWidth: '400px', margin: '5rem auto', padding: '2rem', border: '1px solid #e0e0e0', borderRadius: '8px', textAlign: 'center' }}>
      <h2 style={{ marginBottom: '1.5rem' }}>Sign Up</h2>
      <SignupForm />
      <br />
      <span style={{ display: 'block', marginTop: '1rem' }}>
        {"I already have an account ("}<Link to="/login" style={{ color: '#007bff', textDecoration: 'none' }}>go to login</Link>{")."}
      </span>
    </div>
  );
};

export default SignupPage;