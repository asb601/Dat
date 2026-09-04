'use client';

import { useState } from 'react';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'login failed');
      window.location.href = '/admin';
      return;
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <main className="door">
      <form className="door-card" onSubmit={submit}>
        <p className="door-icon" aria-hidden="true">🕹️</p>
        <h1 className="door-title">Mission control</h1>
        <label className="quest-note-label" htmlFor="admin-pass">password</label>
        <input
          id="admin-pass"
          type="password"
          className="field"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? 'Checking…' : 'Enter'}
        </button>
        {error && <p className="quest-flash quest-flash--error" role="alert">{error}</p>}
      </form>
    </main>
  );
}
