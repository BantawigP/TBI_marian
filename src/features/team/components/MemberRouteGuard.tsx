import { useEffect, type ReactNode } from 'react';
import type { TeamRole } from '../../../types';

interface MemberRouteGuardProps {
  isLoggedIn: boolean;
  isRoleLoading: boolean;
  currentUserRole: TeamRole | null;
  children: ReactNode;
}

export function MemberRouteGuard({
  isLoggedIn,
  isRoleLoading,
  currentUserRole,
  children,
}: MemberRouteGuardProps) {
  useEffect(() => {
    if (!isLoggedIn || isRoleLoading) return;
    if (currentUserRole !== 'Member') {
      window.location.replace('/');
    }
  }, [currentUserRole, isLoggedIn, isRoleLoading]);

  if (isRoleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F1ED]">
        <div className="rounded-lg border border-gray-200 bg-white px-6 py-4 text-gray-700">
          Loading your access...
        </div>
      </div>
    );
  }

  if (currentUserRole !== 'Member') {
    return null;
  }

  return <>{children}</>;
}
