'use client';

import { useState } from 'react';
import Link from 'next/link';
import { authApi } from '@/lib/api';

const B = {
  primary:   '#1B7A6E',
  secondary: '#2A9D8F',
  accent:    '#F5C400',
  dark:      '#0D4A42',
  light:     '#E8F8F5',
};

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      await authApi.forgotPassword(email);
      setMessage('If the email exists, a password reset link has been sent.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: B.light, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 40, width: '100%', maxWidth: 420, boxShadow: '0 4px 20px rgba(0,0,0,.08)' }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <h1 style={{ textAlign: 'center', fontSize: 28, fontWeight: 900, color: B.primary, marginBottom: 8 }}>
            Dial<span style={{ color: B.secondary }}>bee</span>
          </h1>
        </Link>
        <p style={{ textAlign: 'center', color: '#666', marginBottom: 32 }}>Reset your password</p>

        {message && (
          <div style={{ background: '#d1fae5', color: '#059669', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
            {message}
          </div>
        )}

        {error && (
          <div style={{ background: '#fee2e2', color: '#dc2626', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 6 }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: '100%', padding: 12, border: '1px solid #ddd', borderRadius: 8, fontSize: 15, outline: 'none' }}
              placeholder="Enter your email"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: 14,
              background: B.primary,
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: '#666' }}>
          Remember your password?{' '}
          <Link href="/login" style={{ color: B.primary, fontWeight: 600, textDecoration: 'none' }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
