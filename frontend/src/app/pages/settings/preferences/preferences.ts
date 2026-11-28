import { Component, computed, inject, signal } from '@angular/core';
import { ToggleButton } from '../../../atoms/toggle-button/toggle-button';
import { Button } from '../../../atoms/button/button';
import { FormsModule } from '@angular/forms';
import { Divider } from '../../../atoms/divider/divider';
import {
  MenuButton,
  MenuOption,
} from '../../../molecules/menu-button/menu-button';
import { Widget } from '../../../atoms/widget/widget';
import { EventService } from '../../../services/event-service';
import { Tag } from '../../../../models/tag.schema';

@Component({
  selector: 'f-preferences',
  imports: [ToggleButton, Button, FormsModule, Divider, MenuButton, Widget],
  templateUrl: './preferences.html',
  styleUrl: './preferences.css',
})
export class Preferences {
  private eventApi = inject(EventService);

  private _tags = this.eventApi.listTags();
  protected tags = computed<Tag[]>(() =>
    this._tags.hasValue() ? this._tags.value() : []
  );

  protected invertSelection = signal(false);
  protected trackHistory = signal(true);
  protected adultContent = signal(false);
  protected shareActivity = signal(true);

  protected feedMode = signal('preferred');
  protected feedOptions: MenuOption[] = [
    { value: 'preferred', label: 'Preferred Tags Only' },
    { value: 'all', label: 'All Events' },
  ];

  protected openTagPicker() {
    /* */
  }
  protected invite() {
    /* */
  }
  protected createGroup() {
    /* */
  }
}
