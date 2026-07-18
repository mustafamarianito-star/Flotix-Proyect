import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

type AuthMode = 'login' | 'signup';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly mode = signal<AuthMode>('login');
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly infoMessage = signal<string | null>(null);

  fullName = '';
  email = '';
  password = '';

  constructor() {
    effect(() => {
      if (this.auth.currentUser()) {
        this.router.navigateByUrl('/dashboard');
      }
    });
  }

  setMode(mode: AuthMode): void {
    this.mode.set(mode);
    this.errorMessage.set(null);
    this.infoMessage.set(null);
  }

  async loginWithGoogle(): Promise<void> {
    this.errorMessage.set(null);
    this.infoMessage.set(null);
    this.loading.set(true);
    try {
      await this.auth.loginWithGoogle();
    } catch {
      this.errorMessage.set('No se pudo iniciar sesión con Google. Probá de nuevo.');
    } finally {
      this.loading.set(false);
    }
  }

  async submitEmailForm(): Promise<void> {
    this.errorMessage.set(null);
    this.infoMessage.set(null);

    if (!this.email || !this.password) {
      this.errorMessage.set('Completá email y contraseña.');
      return;
    }
    if (this.mode() === 'signup' && this.password.length < 6) {
      this.errorMessage.set('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    this.loading.set(true);
    try {
      if (this.mode() === 'signup') {
        const readyToUse = await this.auth.signUpWithEmail(this.email, this.password, this.fullName);
        if (!readyToUse) {
          this.infoMessage.set('Cuenta creada. Revisá tu email para confirmarla antes de iniciar sesión.');
          this.setMode('login');
        }
      } else {
        await this.auth.loginWithEmail(this.email, this.password);
      }
    } catch (err) {
      this.errorMessage.set(this.describeError(err));
    } finally {
      this.loading.set(false);
    }
  }

  private describeError(err: unknown): string {
    const message = err instanceof Error ? err.message : '';
    if (message.includes('Invalid login credentials')) {
      return 'Email o contraseña incorrectos.';
    }
    if (message.includes('User already registered')) {
      return 'Ya existe una cuenta con ese email. Iniciá sesión.';
    }
    return this.mode() === 'signup'
      ? 'No se pudo crear la cuenta. Probá de nuevo.'
      : 'No se pudo iniciar sesión. Probá de nuevo.';
  }
}
