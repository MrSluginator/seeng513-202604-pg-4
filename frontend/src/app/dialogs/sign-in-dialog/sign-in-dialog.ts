import {
  afterNextRender,
  Component,
  ElementRef,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { Divider } from '../../atoms/divider/divider';
import { Button } from '../../atoms/button/button';
import { Router } from '@angular/router';
import { AccountType } from '../../../models/user.schema';

@Component({
  imports: [Divider, Button],
  selector: 'f-sign-in-dialog',
  styleUrl: './sign-in-dialog.css',
  templateUrl: './sign-in-dialog.html',
})
export class SignInDialog {
  private readonly router = inject(Router);

  readonly requiredRole = input<AccountType | undefined>();
  readonly closed = output<void>();

  private readonly dialog =
    viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    afterNextRender(() => this.dialog().nativeElement.showModal());
  }

  onClose() {
    this.dialog().nativeElement.close();
  }

  onNativeClose() {
    this.closed.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) this.onClose();
  }

  onLogIn() {
    this.onClose();
    this.router.navigate(['/login']);
  }

  onSignUp() {
    this.onClose();
    this.router.navigate(['/signup']);
  }
}
