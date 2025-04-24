// src/LoginPage.jsx
import React from 'react'; 
import { Link } from 'react-router-dom'
import { LoginForm } from 'wasp/client/auth'

export const LoginPage = () => {
  return (
    <div style={{ maxWidth: '400px', margin: '5rem auto', padding: '2rem', border: '1px solid #e0e0e0', borderRadius: '8px', textAlign: 'center' }}>
      <h2 style={{ marginBottom: '1.5rem' }}>Login</h2>
      <LoginForm />
      <br />
      <span style={{ display: 'block', marginTop: '1rem' }}>
        {"I don't have an account yet ("}<Link to="/signup" style={{ color: '#007bff', textDecoration: 'none' }}>go to signup</Link>{")."}
      </span>
    </div>
  );
};

export default LoginPage;