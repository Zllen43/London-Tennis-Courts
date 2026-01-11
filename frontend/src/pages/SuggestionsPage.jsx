import React, { useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

export default function SuggestionsPage() {
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus('');
    const response = await fetch(`${API_BASE}/api/suggestions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, email }),
    });
    if (response.ok) {
      setStatus('Thanks! Your suggestion has been sent.');
      setMessage('');
      setEmail('');
    } else {
      setStatus('Unable to send suggestion.');
    }
  };

  return (
    <div className="container">
      <h1>Suggestions</h1>
      <p>We welcome suggestions to improve the service.</p>
      <form className="card" onSubmit={handleSubmit}>
        <label htmlFor="message">Suggestion</label>
        <textarea
          id="message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          required
          rows={4}
        />
        <label htmlFor="email">Email (optional)</label>
        <input
          id="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
        />
        <button type="submit">Send Suggestion</button>
        {status && <div className="notice" style={{ marginTop: 12 }}>{status}</div>}
      </form>
    </div>
  );
}
