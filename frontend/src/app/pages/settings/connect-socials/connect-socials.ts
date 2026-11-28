import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

type SocialStatus = 'disconnected' | 'pending' | 'verified';

interface Social {
  name: string;
  status: SocialStatus;
}

@Component({
  selector: 'f-connect-socials',
  imports: [RouterLink],
  templateUrl: './connect-socials.html',
  styleUrl: './connect-socials.scss',
})
export class ConnectSocials {
  socials = signal<Social[]>([
    { name: 'Instagram', status: 'disconnected' },
    { name: 'Facebook', status: 'verified' },
    { name: 'TikTok', status: 'pending' },
  ]);

  connect(name: string) {
    // replace with your real OAuth flow
    this.setStatus(name, 'pending');
  }

  disconnect(name: string) {
    this.setStatus(name, 'disconnected');
  }

  private setStatus(name: string, status: SocialStatus) {
    this.socials.update((list) =>
      list.map((s) => (s.name === name ? { ...s, status } : s))
    );
  }
}
