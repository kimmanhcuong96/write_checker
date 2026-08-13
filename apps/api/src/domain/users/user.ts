export type AuthenticatedUser = {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
};

export type ExternalIdentity = {
  subject: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
};
