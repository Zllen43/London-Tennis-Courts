import React, { useEffect, useMemo, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

function formatDay(date) {
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatTime(date) {
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function getDateRange(days = 7) {
  const from = new Date();
  const to = new Date();
  to.setDate(to.getDate() + days);
  return { from, to };
}

function isSameDay(dateA, dateB) {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

export default function HomePage() {
  const [postcode, setPostcode] = useState('');
  const [geoError, setGeoError] = useState('');
  const [location, setLocation] = useState(() => {
    const stored = localStorage.getItem('userLocation');
    return stored ? JSON.parse(stored) : null;
  });
  const [courts, setCourts] = useState([]);
  const [selectedCourtId, setSelectedCourtId] = useState('');
  const [slots, setSlots] = useState([]);
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [email, setEmail] = useState('');
  const [notifyMessage, setNotifyMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!location) return;
    fetch(`${API_BASE}/api/courts?lat=${location.lat}&lng=${location.lng}`)
      .then((res) => res.json())
      .then((data) => setCourts(data.courts || []))
      .catch(() => setGeoError('Unable to load courts.'));
  }, [location]);

  useEffect(() => {
    if (!selectedCourtId) return;
    const { from, to } = getDateRange();
    setLoading(true);
    fetch(
      `${API_BASE}/api/courts/${selectedCourtId}/availability?from=${from.toISOString()}&to=${to.toISOString()}`
    )
      .then((res) => res.json())
      .then((data) => {
        setSlots(data.slots || []);
        setSelectedSlots([]);
      })
      .catch(() => setSlots([]))
      .finally(() => setLoading(false));
  }, [selectedCourtId]);

  const days = useMemo(() => {
    const { from } = getDateRange();
    return Array.from({ length: 7 }).map((_, index) => {
      const date = new Date(from);
      date.setDate(date.getDate() + index);
      return date;
    });
  }, []);

  const selectedCourt = courts.find((court) => court.id === selectedCourtId);

  const handleUsePostcode = async () => {
    setGeoError('');
    setNotifyMessage('');
    try {
      const response = await fetch(`${API_BASE}/api/geo/postcode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postcode }),
      });
      if (!response.ok) {
        setGeoError('Invalid postcode. Please try again.');
        return;
      }
      const data = await response.json();
      setLocation(data);
      localStorage.setItem('userLocation', JSON.stringify(data));
    } catch (error) {
      setGeoError('Unable to validate postcode.');
    }
  };

  const toggleSlot = (slot) => {
    if (slot.status !== 'FULL') return;
    const key = `${slot.start_time}-${slot.end_time}`;
    setSelectedSlots((prev) =>
      prev.find((item) => `${item.start_time}-${item.end_time}` === key)
        ? prev.filter((item) => `${item.start_time}-${item.end_time}` !== key)
        : [...prev, slot]
    );
  };

  const handleNotify = async () => {
    setNotifyMessage('');
    if (!selectedSlots.length || !selectedCourtId) {
      setNotifyMessage('Please choose at least one full slot.');
      return;
    }
    if (!email) {
      setNotifyMessage('Please enter your email.');
      return;
    }
    const response = await fetch(`${API_BASE}/api/alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        court_id: selectedCourtId,
        slots: selectedSlots.map((slot) => ({
          start_time: slot.start_time,
          end_time: slot.end_time,
        })),
      }),
    });
    if (!response.ok) {
      setNotifyMessage('Unable to create alert. Please try again.');
      return;
    }
    const data = await response.json();
    setNotifyMessage(`Alerts created! Manage them at ${window.location.origin}/manage/${data.token}`);
  };

  return (
    <div className="container">
      <div className="header">
        <div>
          <h1>London Tennis Court Alerts</h1>
          <p>Get alerted the moment a fully-booked court becomes available.</p>
        </div>
        <div className="grid grid-2">
          <a href="https://buymeacoffee.com" target="_blank" rel="noreferrer">
            Buy me a coffee
          </a>
          <a href="/suggestions">Send us a suggestion</a>
        </div>
      </div>

      <div className="card grid grid-2">
        <div>
          <label htmlFor="postcode">Your postcode</label>
          <input
            id="postcode"
            value={postcode}
            onChange={(event) => setPostcode(event.target.value)}
            placeholder="E15 2GZ"
          />
        </div>
        <div>
          <label>&nbsp;</label>
          <button type="button" onClick={handleUsePostcode}>
            Use
          </button>
        </div>
        {geoError && <div className="notice">{geoError}</div>}
      </div>

      <div className="card">
        <label htmlFor="court">Select Court / Choose a location...</label>
        <select
          id="court"
          value={selectedCourtId}
          onChange={(event) => setSelectedCourtId(event.target.value)}
        >
          <option value="">Select a court</option>
          {courts.map((court) => (
            <option key={court.id} value={court.id}>
              {court.name} ({court.borough || 'London'}) - {court.provider} • {court.distance_km.toFixed(1)} km
            </option>
          ))}
        </select>
      </div>

      {!selectedCourtId && (
        <div className="notice">Please select a location to view court availability.</div>
      )}

      {selectedCourtId && (
        <div className="card">
          <h2>Availability grid</h2>
          {loading && <p>Loading availability...</p>}
          {!loading && slots.length === 0 && <p>No availability data yet.</p>}
          {!loading && slots.length > 0 && (
            <div className="grid grid-7">
              {days.map((day) => {
                const daySlots = slots
                  .filter((slot) => isSameDay(new Date(slot.start_time), day))
                  .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
                return (
                  <div key={day.toISOString()}>
                    <strong>{formatDay(day)}</strong>
                    <div className="grid" style={{ marginTop: 8 }}>
                      {daySlots.length === 0 && (
                        <div className="slot closed">No data</div>
                      )}
                      {daySlots.map((slot) => {
                        const isSelected = selectedSlots.some(
                          (item) => item.start_time === slot.start_time && item.end_time === slot.end_time
                        );
                        const statusClass =
                          slot.status === 'AVAILABLE'
                            ? 'available'
                            : slot.status === 'FULL'
                              ? 'full'
                              : 'closed';
                        const label =
                          slot.status === 'AVAILABLE'
                            ? 'Available'
                            : slot.status === 'FULL'
                              ? 'Fully booked'
                              : 'Closed';
                        return (
                          <div
                            key={`${slot.start_time}-${slot.end_time}`}
                            className={`slot ${statusClass} ${isSelected ? 'selected' : ''}`}
                            onClick={() => {
                              if (slot.status === 'AVAILABLE') {
                                window.open(slot.booking_url, '_blank');
                                return;
                              }
                              toggleSlot(slot);
                            }}
                            role="button"
                          >
                            {formatTime(new Date(slot.start_time))}
                            <div>{label}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="card">
        <h3>Notify Me</h3>
        <p>
          Click on any red slot to get notified of availability. Selected full slots: {
            selectedSlots.length
          }
        </p>
        {selectedCourt && (
          <p>
            Selected court: <strong>{selectedCourt.name}</strong>
          </p>
        )}
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
        />
        <div style={{ marginTop: 12 }}>
          <button type="button" onClick={handleNotify}>
            Get Notified ({selectedSlots.length} full slots)
          </button>
        </div>
        {notifyMessage && (
          <div className="notice" style={{ marginTop: 12 }}>
            {notifyMessage}
          </div>
        )}
      </div>
    </div>
  );
}
