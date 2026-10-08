import AuthForm from '@/components/auth/AuthForm';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In | Spendee Expense Manager',
  description: 'Sign in to access your Forex, Cash, and Blocked accounts expense manager.',
};

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <AuthForm mode="login" />
    </main>
  );
}
