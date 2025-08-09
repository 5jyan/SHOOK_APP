import React from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  // For now, always show the children (no authentication check)
  // TODO: Implement proper authentication check
  return <>{children}</>;
}