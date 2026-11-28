import { Component, signal } from '@angular/core';
import { Button } from '../../../atoms/button/button';
import { Divider } from '../../../atoms/divider/divider';
import { Widget } from '../../../atoms/widget/widget';
import { Icon } from '../../../atoms/icon/icon';

type ConnectionStatus = 'disconnected' | 'pending' | 'verified';

interface SocialAccount {
  id: string;
  name: string;
  status: ConnectionStatus;
}

@Component({
  selector: 'f-connect-socials',
  imports: [Button, Divider, Icon],
  templateUrl: './connect-socials.html',
  styleUrl: './connect-socials.css',
})
export class ConnectSocials {
  protected accounts = signal<SocialAccount[]>([
    { id: 'instagram', name: 'Instagram', status: 'disconnected' },
    { id: 'facebook', name: 'Facebook', status: 'verified' },
    { id: 'tiktok', name: 'TikTok', status: 'pending' },
  ]);

  protected connect(id: string): void {
    this.setStatus(id, 'pending');
    // TODO: start the OAuth flow for this provider
  }

  protected disconnect(id: string): void {
    this.setStatus(id, 'disconnected');
    // TODO: revoke the connection on the backend
  }

  private setStatus(id: string, status: ConnectionStatus): void {
    this.accounts.update((accounts) =>
      accounts.map((a) => (a.id === id ? { ...a, status } : a))
    );
  }
}
