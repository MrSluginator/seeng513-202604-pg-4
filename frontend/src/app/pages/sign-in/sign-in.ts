import { Component, computed, inject, input, signal } from '@angular/core';
import { TextInput } from '../../atoms/text-input/text-input';
import { Button } from '../../atoms/button/button';
import { TabGroup, TabOption } from '../../atoms/tab-group/tab-group';
import { Router } from '@angular/router';
import {
  FormsModule,
  NonNullableFormBuilder,
  ReactiveFormsModule,
} from '@angular/forms';
import { AuthService } from '../../services/auth-service';
import {
  LoginRequest,
  SignupRequest,
  Username,
} from '../../../models/user.schema';
import { getErrorMessage, zodValidator } from '../../../utils/validation';
import { Logo } from '../../atoms/logo/logo';

type AuthMode = 'login' | 'signup';

@Component({
  imports: [
    TextInput,
    Button,
    TabGroup,
    FormsModule,
    ReactiveFormsModule,
    Logo,
  ],
  selector: 'f-sign-in',
  styleUrl: './sign-in.css',
  templateUrl: './sign-in.html',
})
export class SignIn {
  private readonly router = inject(Router);
  private readonly authApi = inject(AuthService);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly mode = input<AuthMode>('login');

  readonly tabs: TabOption[] = [
    { value: 'login', label: 'Log In' },
    { value: 'signup', label: 'Sign Up' },
  ];

  protected switchTo(mode: AuthMode): void {
    this.router.navigate(['/', mode], { queryParamsHandling: 'preserve' });
  }

  protected readonly data = computed(() =>
    this.mode() === 'login'
      ? {
          header: 'Welcome Back!',
          text: "Log in to see what's happening around you.",
          button: 'Log In',
          password: 'Enter your password',
        }
      : {
          header: 'Create an account',
          text: "Start discovering new places, events what's happening",
          button: 'Create Account',
          password: 'Create a password',
        }
  );

  protected readonly passwordHidden = signal(true);

  togglePassword() {
    this.passwordHidden.update((prev) => !prev);
  }

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly loginForm = this.fb.group({
    email: ['', zodValidator(LoginRequest.shape.email)],
    password: ['', zodValidator(LoginRequest.shape.password)],
  });

  protected readonly signupForm = this.fb.group({
    username: ['', zodValidator(Username)],
    email: ['', zodValidator(SignupRequest.shape.email)],
    password: ['', zodValidator(SignupRequest.shape.password)],
  });

  form = computed(() =>
    this.mode() === 'login' ? this.loginForm : this.signupForm
  );

  protected submit(): void {
    const form = this.mode() === 'login' ? this.loginForm : this.signupForm;
    if (form.invalid) {
      form.markAllAsTouched();
      return;
    }

    this.error.set(null);
    this.loading.set(true);

    const request$ =
      this.mode() === 'login'
        ? this.authApi.login(this.loginForm.getRawValue())
        : this.authApi.signUp(this.signupForm.getRawValue());

    request$.subscribe({
      next: () => this.router.navigateByUrl('/'), // or the returnUrl logic from earlier
      error: (err) => {
        this.error.set(getErrorMessage(err));
        this.loading.set(false);
      },
    });
  }

  toGoogle() {
    return;
  }
  toApple() {
    return;
  }
  toFacebook() {
    return;
  }
}
