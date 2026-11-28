import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

interface NotificationOption {
  label: string;
  enabled: boolean;
}

@Component({
  selector: 'f-notifications',
  imports: [RouterLink],
  templateUrl: './notifications.html',
  styleUrl: './notifications.scss',
})
export class Notifications {
  emailNotifications = signal(false);

  notificationOptions = signal<NotificationOption[]>([
    // replace with your real options
    { label: 'Someone saves my event', enabled: true },
    { label: 'An event I saved is starting soon', enabled: true },
    { label: 'New events near me', enabled: false },
  ]);

  toggleEmail() {
    this.emailNotifications.update((v) => !v);
  }

  toggleNotification(index: number) {
    this.notificationOptions.update((options) =>
      options.map((o, i) => (i === index ? { ...o, enabled: !o.enabled } : o))
    );
  }
}
