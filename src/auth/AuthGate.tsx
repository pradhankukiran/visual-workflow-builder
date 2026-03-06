import { useAuth, SignIn } from '@clerk/clerk-react';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--color-bg)]">
        <div className="text-[var(--color-text-muted)]">Loading...</div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--color-bg)]">
        <SignIn routing="hash" />
      </div>
    );
  }

  return <>{children}</>;
}
