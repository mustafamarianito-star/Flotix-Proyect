import { Injectable, signal } from '@angular/core';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../supabase/supabase.client';

export interface AuthUser {
  name: string;
  email: string;
  picture?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly currentUser = signal<AuthUser | null>(null);

  /** Se resuelve una vez que se leyó la sesión inicial de Supabase. */
  readonly ready: Promise<void>;

  constructor() {
    this.ready = supabase.auth.getSession().then(({ data }) => {
      this.setUserFromSession(data.session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      this.setUserFromSession(session);
    });
  }

  async loginWithGoogle(): Promise<void> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: new URL('dashboard', document.baseURI).toString() },
    });
    if (error) throw error;
  }

  async loginWithEmail(email: string, password: string): Promise<void> {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  /** Devuelve `true` si la cuenta queda lista para usar de inmediato (sin confirmación de email pendiente). */
  async signUpWithEmail(email: string, password: string, fullName: string): Promise<boolean> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw error;
    return data.session !== null;
  }

  async logout(): Promise<void> {
    await supabase.auth.signOut();
    this.currentUser.set(null);
  }

  isAuthenticated(): boolean {
    return this.currentUser() !== null;
  }

  private setUserFromSession(session: Session | null): void {
    const user = session?.user ?? null;
    if (!user) {
      this.currentUser.set(null);
      return;
    }
    const metadata = user.user_metadata ?? {};
    this.currentUser.set({
      name: metadata['full_name'] ?? metadata['name'] ?? user.email ?? '',
      email: user.email ?? '',
      picture: metadata['avatar_url'],
    });
  }
}
