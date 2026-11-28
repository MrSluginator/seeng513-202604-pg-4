import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth-service';
import { Icon } from '../../atoms/icon/icon';

@Component({
  imports: [Icon],
  selector: 'f-profile-button',
  styleUrl: './profile-button.css',
  templateUrl: './profile-button.html',
})
export class ProfileButton {
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);

  onClick() {
    this.router.navigate(['/settings']);
  }
}
