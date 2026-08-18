import { UserManager, WebStorageStateStore, User } from "oidc-client-ts";

const DEFAULT_SCOPE = "openid profile email roles";

export class AuthService {
  private userManager: UserManager;
  private user: User | null = null;

  constructor() {
    const authority = import.meta.env.VITE_OIDC_AUTHORITY;
    const clientId = import.meta.env.VITE_OIDC_CLIENT_ID;
    const redirectUri = import.meta.env.VITE_OIDC_REDIRECT_URI ?? `${window.location.origin}/auth/callback`;
    const postLogoutRedirect = import.meta.env.VITE_OIDC_POST_LOGOUT_REDIRECT ?? window.location.origin;
    const scope = import.meta.env.VITE_OIDC_SCOPE ?? DEFAULT_SCOPE;

    this.userManager = new UserManager({
      authority,
      client_id: clientId,
      redirect_uri: redirectUri,
      post_logout_redirect_uri: postLogoutRedirect,
      response_type: "code",
      scope,
      userStore: new WebStorageStateStore({ store: window.localStorage }),
    });

    this.userManager.getUser().then((u) => (this.user = u)).catch(() => {});

    this.userManager.events.addUserLoaded((u) => (this.user = u));
    this.userManager.events.addUserUnloaded(() => (this.user = null));
  }

  async signIn() {
    return this.userManager.signinRedirect();
  }

  async handleCallback() {
    const user = await this.userManager.signinCallback();
    this.user = user;
    return user;
  }

  async signOut() {
    return this.userManager.signoutRedirect();
  }

  async handleSignoutCallback() {
    await this.userManager.signoutCallback();
    this.user = null;
  }

  async getAccessToken(): Promise<string | null> {
    if (this.user && this.user.access_token) return this.user.access_token;
    const u = await this.userManager.getUser();
    this.user = u;
    return u?.access_token ?? null;
  }

  getUser() {
    return this.user;
  }
}

// Export a singleton
export const authService = new AuthService();
