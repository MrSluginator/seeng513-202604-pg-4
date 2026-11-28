import { Location } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { Button } from '../../atoms/button/button';
import { Footer } from '../footer/footer';

@Component({
  imports: [Button, Footer],
  selector: 'f-status-view',
  styleUrl: './status-view.css',
  templateUrl: './status-view.html',
})
export class StatusView {
  private location = inject(Location);
  private router = inject(Router);

  code = input.required<string>();
  title = input.required<string>();
  message = input.required<string>();

  goBack() {
    const hasInAppHistory = (history.state?.navigationId ?? 0) > 1;

    if (hasInAppHistory) {
      this.location.back();
    } else {
      this.router.navigateByUrl('/');
    }
  }

  goHome() {
    this.router.navigateByUrl('/');
  }
}
