import AuthForm from '@/components/auth/AuthForm';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign Up | Spendee Expense Manager',
  description: 'Create an account to manage your Germany student expense accounts.',
};

export default function SignupPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <AuthForm mode="signup" />
    </main>
  );
}
