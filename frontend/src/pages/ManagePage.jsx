import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

export default function ManagePage() {
  const { token } = useParams();
  const [subscriptions, setSubscriptions] = useState([]);
  const [message, setMessage] = useState('');

  const loadSubscriptions = async () => {
    setMessage('');
    try {
      const response = await fetch(`${API_BASE}/api/alerts/manage/${token}`);
      if (!response.ok) {
        setMessage('No active alerts found.');
        return;
      }
      const data = await response.json();
      setSubscriptions(data.subscriptions || []);
    } catch (error) {
      setMessage('Unable to load alerts.');
    }
  };

  useEffect(() => {
    loadSubscriptions();
  }, [token]);

  const handleDelete = async (id) => {
    await fetch(`${API_BASE}/api/alerts/manage/${token}/${id}`, { method: 'DELETE' });
    await loadSubscriptions();
  };

  const handleDeleteAll = async () => {
    await fetch(`${API_BASE}/api/alerts/manage/${token}`, { method: 'DELETE' });
    setSubscriptions([]);
    setMessage('All alerts deleted and your data removed.');
  };

  return (
    <div className="container">
      <h1>Manage Alerts</h1>
      {message && <div className="notice">{message}</div>}
      {subscriptions.length > 0 && (
        <div className="card">
          <h3>Your alerts</h3>
          <ul>
            {subscriptions.map((sub) => (
              <li key={sub.id} style={{ marginBottom: 10 }}>
                <strong>{sub.court_name}</strong> —{' '}
                {new Date(sub.start_time).toLocaleString('en-GB')}
                <button
                  type="button"
                  className="secondary"
                  style={{ marginLeft: 12 }}
                  onClick={() => handleDelete(sub.id)}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
          <button type="button" onClick={handleDeleteAll}>
            Delete my data
          </button>
        </div>
      )}
    </div>
  );
}
