import React from 'react';
import { Navigate } from 'react-router-dom';
import { useGateAccount } from './account/GateAccountContext';

// Gate guard: non-members are bounced to the offering at /app. Connection state
// alone is not enough — an active membership is required.
const RequireMembership: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isMember } = useGateAccount();
  if (!isMember) return <Navigate to="/app" replace />;
  return <>{children}</>;
};

export default RequireMembership;
