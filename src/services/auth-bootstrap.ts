export interface BootstrapUser {
  id: number;
  username: string;
  email: string | null;
  role: 'user' | 'tester' | 'manager';
  isGuest?: boolean;
}

interface CurrentUserResult {
  success: boolean;
  data?: BootstrapUser;
  status?: number;
}

export type AuthBootstrapResult =
  | { source: 'session'; user: BootstrapUser }
  | { source: 'guest'; user: BootstrapUser }
  | { source: 'cache'; user: null };

interface AuthBootstrapDependencies {
  hasCachedAuth: boolean;
  getCurrentUser: () => Promise<CurrentUserResult>;
  createGuestAccount: (deviceId: string) => Promise<BootstrapUser>;
  getDeviceId: () => Promise<string>;
}

export async function bootstrapAuth({
  hasCachedAuth,
  getCurrentUser,
  createGuestAccount,
  getDeviceId,
}: AuthBootstrapDependencies): Promise<AuthBootstrapResult> {
  const session = await getCurrentUser();

  if (session.success && session.data?.id && session.data.username) {
    return { source: 'session', user: session.data };
  }

  const sessionIsMissing = session.status === 401;
  if (hasCachedAuth && !sessionIsMissing) {
    return { source: 'cache', user: null };
  }

  try {
    const deviceId = await getDeviceId();
    const guestUser = await createGuestAccount(deviceId);
    return { source: 'guest', user: guestUser };
  } catch (error) {
    if (hasCachedAuth) {
      return { source: 'cache', user: null };
    }
    throw error;
  }
}
