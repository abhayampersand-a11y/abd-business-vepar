import { Suspense } from 'react';
import { AuthCard } from '@/components/auth/AuthCard';

export const metadata = { title: 'Sign in — Vyapar' };

export default function LoginPage() {
  // AuthCard reads ?next / ?error, and useSearchParams needs a boundary.
  return (
    <Suspense>
      <AuthCard mode="login" />
    </Suspense>
  );
}
