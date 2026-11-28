import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Color, Size } from '../../../models/types';
import flareLogo1 from '../../../assets/icons/flare-logo-1.svg';

@Component({
  selector: 'f-logo',
  styleUrl: './logo.css',
  templateUrl: './logo.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Logo {
  private sanitizer = inject(DomSanitizer);

  size = input<Size>('xl');
  color = input<Color>();

  // Safe to trust: this string comes from your own bundled SVG file
  svg = computed(() => this.sanitizer.bypassSecurityTrustHtml(flareLogo1));

  protected resolvedColor = computed(() => {
    const color = this.color();
    return color ? `var(--${color})` : null;
  });
  protected resolvedSize = computed(() => `var(--logo-${this.size()})`);
}
