import { Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Button } from '../../../atoms/button/button';
import { Divider } from '../../../atoms/divider/divider';
import { TextInput } from '../../../atoms/text-input/text-input';

@Component({
  selector: 'f-account',
  imports: [ReactiveFormsModule, Button, Divider, TextInput],
  templateUrl: './account.html',
  styleUrl: './account.css',
})
export class Account {
  private fb = inject(NonNullableFormBuilder);

  protected form = this.fb.group({
    username: '',
    bio: '',
    email: '',
    phone: '',
    // Display-only; disabled controls are left out of form.value
    password: { value: '*********', disabled: true },
  });

  protected changePicture(): void {
    // TODO: open image picker / upload flow
  }

  protected resetPassword(): void {
    // TODO: trigger password reset flow
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { username, bio, email, phone } = this.form.getRawValue();
    // TODO: send to backend
  }
}
