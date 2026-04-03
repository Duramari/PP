'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';

const B = {
  primary:   '#1B7A6E',
  secondary: '#2A9D8F',
  accent:    '#F5C400',
  dark:      '#0D4A42',
  light:     '#E8F8F5',
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authApi.login(email, password) as any;
      if (typeof window !== 'undefined') {
        localStorage.setItem('dialbee_access_token', response.accessToken || response.data?.accessToken);
        localStorage.setItem('dialbee_refresh_token', response.refreshToken || response.data?.refreshToken);
      }
      router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
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
        <p style={{ textAlign: 'center', color: '#666', marginBottom: 32 }}>Welcome back! Sign in to continue.</p>

        {error && (
          <div style={{ background: '#fee2e2', color: '#dc2626', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
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

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 6 }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: '100%', padding: 12, border: '1px solid #ddd', borderRadius: 8, fontSize: 15, outline: 'none' }}
              placeholder="Enter your password"
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
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: '#666' }}>
          Don&apos;t have an account?{' '}
          <Link href="/register" style={{ color: B.primary, fontWeight: 600, textDecoration: 'none' }}>
            Register
          </Link>
        </p>

        <p style={{ textAlign: 'center', marginTop: 12, fontSize: 14 }}>
          <Link href="/forgot-password" style={{ color: B.secondary, textDecoration: 'none' }}>
            Forgot password?
          </Link>
        </p>
      </div>
    </div>
  );
}
