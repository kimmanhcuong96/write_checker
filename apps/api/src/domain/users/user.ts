export type AuthenticatedUser = {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  blockedUntil: string | null;
  permanentlyBlocked: boolean;
};

export type ExternalIdentity = {
  subject: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
};
