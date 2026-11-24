import {
  Component,
  computed,
  contentChild,
  ElementRef,
  input,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Button } from '../../atoms/button/button';

@Component({
  selector: 'f-carousel',
  imports: [Button, NgTemplateOutlet],
  templateUrl: './carousel.html',
  styleUrl: './carousel.css',
})
export class Carousel<T> {
  items = input.required<T[]>();
  getKey = input<(item: T, index: number) => unknown>((_, i) => i);
  overlay = input(true);
  label = input<string>();
  itemLabel = input('item');
  showControls = input(true);

  /** Slide template: <ng-template let-item let-i="index">...</ng-template> */
  protected template = contentChild.required(TemplateRef);

  private track = viewChild<ElementRef<HTMLElement>>('track');

  protected index = signal(0);
  private target: number | null = null; // slide we're currently animating to

  protected isFirst = computed(() => this.index() === 0);
  protected isLast = computed(() => this.index() === this.items().length - 1);

  protected goTo(i: number): void {
    const el = this.track()?.nativeElement;
    const clamped = Math.max(0, Math.min(this.items().length - 1, i));
    const slide = el?.children[clamped] as HTMLElement | undefined;
    if (!el || !slide) return;
    this.target = clamped;
    slide.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest', // don't scroll the page vertically
    });
  }

  protected step(delta: number): void {
    this.goTo((this.target ?? this.index()) + delta);
  }

  protected onScroll(event: Event): void {
    const el = event.currentTarget as HTMLElement;
    const center = el.scrollLeft + el.clientWidth / 2;
    let closest = 0;
    let minDist = Infinity;
    Array.from(el.children).forEach((child, i) => {
      const c = child as HTMLElement;
      const dist = Math.abs(c.offsetLeft + c.offsetWidth / 2 - center);
      if (dist < minDist) {
        minDist = dist;
        closest = i;
      }
    });
    this.index.set(closest);
    if (closest === this.target) this.target = null; // arrived
  }

  // if the user grabs the track mid-animation, forget the pending target
  protected cancelTarget(): void {
    this.target = null;
  }
}
