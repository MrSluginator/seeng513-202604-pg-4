import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Divider } from '../../../atoms/divider/divider';
import { ToggleButton } from '../../../atoms/toggle-button/toggle-button';

interface NotificationOption {
  label: string;
  enabled: boolean;
}

@Component({
  selector: 'f-notifications',
  imports: [FormsModule, Divider, ToggleButton],
  templateUrl: './notifications.html',
  styleUrl: './notifications.css',
})
export class Notifications {
  protected emailNotifications = signal(true);

  protected notificationOptions = signal<NotificationOption[]>([
    { label: 'Events that I RSVDed to are starting soon', enabled: false },
    { label: 'My RSVPed events have updates', enabled: true },
    { label: 'Flare finds events that may interest me', enabled: true },
    { label: 'New events in my area are created', enabled: false },
    { label: 'There are trending events in my area', enabled: false },
    { label: 'People send me sparks', enabled: true },
  ]);

  protected setOption(index: number, enabled: boolean): void {
    this.notificationOptions.update((options) =>
      options.map((option, i) =>
        i === index ? { ...option, enabled } : option
      )
    );
  }
}
