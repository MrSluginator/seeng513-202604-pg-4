import { Component, computed, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Color, Size } from '../../../models/types';
import { IconName, icons } from './icons';

@Component({
  selector: 'f-icon',
  templateUrl: './icon.html',
  styleUrl: './icon.css',
})
export class Icon {
  private sanitizer = inject(DomSanitizer);

  name = input.required<IconName>();
  size = input<Size>('xs');
  color = input<Color>();
  fill = input<boolean | undefined>(false);

  // Safe to trust: these strings come from your own bundled SVG files
  svg = computed(() =>
    this.sanitizer.bypassSecurityTrustHtml(icons[this.name()] ?? ''),
  );
}