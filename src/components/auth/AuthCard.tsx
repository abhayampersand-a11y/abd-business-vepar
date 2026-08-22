'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button, Field, Input } from '@/components/ui';

/** Google's mark, inlined so the button works with no network request. */
function GoogleMark() {
  return (
    <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </svg>
  );
}

export function AuthCard({ mode }: { mode: 'login' | 'register' }) {
  const isRegister = mode === 'register';
  const params = useSearchParams();
  // Same-site paths only — an attacker-supplied ?next=//evil.com must not
  // survive into window.location.
  const requested = params.get('next');
  const next =
    requested && requested.startsWith('/') && !requested.startsWith('//') ? requested : '/';

  // An OAuth failure comes back as ?error= on the redirect from the callback.
  const [error, setError] = useState<string | null>(params.get('error'));
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const res = await fetch(isRegister ? '/api/auth/register' : '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isRegister ? form : { email: form.email, password: form.password },
        ),
      });
      const body = await res.json();

      if (!res.ok) {
        setError(body.error ?? 'Something went wrong. Please try again.');
        setBusy(false);
        return;
      }

      // A full load rather than a client navigation: it drops any cached data
      // belonging to whoever was signed in before.
      window.location.assign(next);
    } catch {
      setError('Could not reach the server. Check your connection.');
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="mb-7 text-center">
          <h1 className="text-[26px] font-semibold tracking-tight text-ink">
            {isRegister ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className="mt-1.5 text-sm text-ink-soft">
            {isRegister
              ? 'Set up a login for your business books.'
              : 'Sign in to your business books.'}
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">
          {error && (
            <p
              role="alert"
              className="mb-4 rounded-lg bg-danger/8 px-3 py-2.5 text-[13px] text-danger"
            >
              {error}
            </p>
          )}

          <form onSubmit={onSubmit} className="flex flex-col gap-3.5">
            {isRegister && (
              <Field label="Your name" required>
                <Input
                  value={form.name}
                  onChange={set('name')}
                  autoComplete="name"
                  placeholder="Ramesh Patel"
                  required
                />
              </Field>
            )}

            <Field label="Email" required>
              <Input
                type="email"
                value={form.email}
                onChange={set('email')}
                autoComplete="email"
                placeholder="you@business.com"
                required
              />
            </Field>

            <Field
              label="Password"
              required
              hint={isRegister ? 'At least 8 characters.' : undefined}
            >
              <Input
                type="password"
                value={form.password}
                onChange={set('password')}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                placeholder="••••••••"
                required
                minLength={isRegister ? 8 : undefined}
              />
            </Field>

            <Button type="submit" size="lg" loading={busy} className="mt-1.5 w-full">
              {isRegister ? 'Create account' : 'Sign in'}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="text-[12px] text-ink-faint">or</span>
            <span className="h-px flex-1 bg-line" />
          </div>

          {/* A plain link, not fetch: OAuth needs a top-level browser navigation. */}
          <a
            href={`/api/auth/google?next=${encodeURIComponent(next)}`}
            className="inline-flex h-11 w-full items-center justify-center gap-2.5 rounded-full border border-line-strong bg-white text-[15px] font-medium text-ink transition hover:bg-canvas"
          >
            <GoogleMark />
            Continue with Google
          </a>
        </div>

        <p className="mt-5 text-center text-[13.5px] text-ink-soft">
          {isRegister ? 'Already have an account? ' : "Don't have an account? "}
          <Link
            href={isRegister ? '/login' : '/register'}
            className="font-medium text-accent hover:underline"
          >
            {isRegister ? 'Sign in' : 'Create one'}
          </Link>
        </p>
      </div>
    </div>
  );
}
