import { Suspense } from 'react';
import { AuthCard } from '@/components/auth/AuthCard';

export const metadata = { title: 'Create account — Vyapar' };

export default function RegisterPage() {
  return (
    <Suspense>
      <AuthCard mode="register" />
    </Suspense>
  );
}
