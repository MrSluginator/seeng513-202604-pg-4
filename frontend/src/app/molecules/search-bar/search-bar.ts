import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { TextInput } from '../../atoms/text-input/text-input';
import { Icon } from '../../atoms/icon/icon';
import { FormsModule } from '@angular/forms';

export interface SearchResult<T> {
  label: string;
  value: T;
}

@Component({
  selector: 'f-search-bar',
  imports: [FormsModule, TextInput, Icon],
  styleUrl: './search-bar.css',
  templateUrl: './search-bar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(keydown.escape)': 'close()',
  },
})
export class SearchBar<T> {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  // API
  readonly placeholder = input('Search...');
  readonly results = input<SearchResult<T>[]>([]);
  readonly loading = input(false);
  readonly query = model('');
  readonly resultSelected = output<SearchResult<T>>();
  readonly submitted = output<string>();

  // Internal UI state
  protected readonly isOpen = signal(false);
  protected readonly activeIndex = signal(-1);
  protected readonly showMenu = computed(
    () => this.isOpen() && this.query().trim().length > 0
  );

  protected open(): void {
    this.isOpen.set(true);
  }

  protected close(): void {
    this.isOpen.set(false);
    this.activeIndex.set(-1);
  }

  protected onQueryChange(value: string): void {
    this.query.set(value);
    this.activeIndex.set(-1);
    this.open();
  }

  protected onKeydown(event: KeyboardEvent): void {
    const count = this.results().length;
    switch (event.key) {
      case 'ArrowDown':
        if (count === 0) return;
        event.preventDefault();
        this.open();
        this.activeIndex.update((i) => (i + 1) % count);
        break;
      case 'ArrowUp':
        if (count === 0) return;
        event.preventDefault();
        this.activeIndex.update((i) => (i <= 0 ? count - 1 : i - 1));
        break;
      case 'Enter': {
        event.preventDefault();
        const result = this.results()[this.activeIndex()];
        if (result) {
          this.select(result);
        } else {
          const trimmed = this.query().trim();
          if (trimmed) {
            this.submitted.emit(trimmed);
            this.close();
          }
        }
        break;
      }
    }
  }

  protected select(result: SearchResult<T>): void {
    this.resultSelected.emit(result);
    this.query.set('');
    this.close();
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }
}
