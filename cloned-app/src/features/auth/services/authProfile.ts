export const deriveUserProfile = (user?: any) => {
  if (!user) {
    return { name: '', email: '' };
  }

  const metadata = user.user_metadata || {};
  const identityData = user.identities?.[0]?.identity_data || {};
  const email =
    user.email || metadata.email || metadata.preferred_email || identityData.email || '';
  const name =
    metadata.full_name ||
    metadata.name ||
    [metadata.given_name, metadata.family_name].filter(Boolean).join(' ') ||
    identityData.name ||
    email ||
    '';

  return { name, email };
};
