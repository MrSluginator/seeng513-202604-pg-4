import { Component, computed, inject, signal } from '@angular/core';
import { Divider } from '../../atoms/divider/divider';
import {
  SearchBar,
  SearchFn,
  SearchResultTemplate,
} from '../../molecules/search-bar/search-bar';
import { RangeFilter } from '../../molecules/range-filter/range-filter';
import { AllCategories } from '../../molecules/category/all-categories';
import { TextInput } from '../../atoms/text-input/text-input';
import { EventCard } from '../../components/event-card/event-card';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Tag } from '../../../models/tag.schema';
import { Range } from '../../../models/types';
import { Button } from '../../atoms/button/button';
import { EventDetail } from '../../../models/event.schema';
import {
  categoriesList,
  CategoryForm,
  CategoryName,
} from '../../molecules/category/categories';
import { range2Price, range2Time } from '../../../utils/format';
import { Widget } from '../../atoms/widget/widget';
import { Icon } from '../../atoms/icon/icon';
import { TextField } from '../../atoms/text-field/text-field';

export interface UploadedImage {
  id: string;
  file: File;
  url: string;
  is_cover: boolean;
}

const minItems =
  (n: number): ValidatorFn =>
  (c) =>
    (c.value?.length ?? 0) >= n
      ? null
      : { minItems: { required: n, actual: c.value?.length ?? 0 } };

const rangeOrdered: ValidatorFn = (c) => {
  const v = c.value as Range<number> | null;
  return !v || v[0] <= v[1] ? null : { rangeOrder: true };
};

// Replace with your real tag source (service / API)
// const SUGGESTED_TAGS: Record<CategoryId, Tag[]> = {
//   food: [{ slug: 'brunch', name: 'Brunch' }, { slug: 'patio', name: 'Patio' }, { slug: 'vegan', name: 'Vegan' }],
//   sights: [{ slug: 'top-views', name: 'Top Views' }, { slug: 'river', name: 'River' }, { slug: 'outdoors', name: 'Outdoors' }],
//   events: [{ slug: 'festival', name: 'Festival' }, { slug: 'market', name: 'Market' }, { slug: 'live-music', name: 'Live Music' }],
//   activities: [{ slug: 'hiking', name: 'Hiking' }, { slug: 'picnic', name: 'Picnic' }, { slug: 'skating', name: 'Skating' }],
//   nightlife: [{ slug: 'bar', name: 'Bar' }, { slug: 'dancing', name: 'Dancing' }, { slug: 'karaoke', name: 'Karaoke' }],
//   exciting: [{ slug: 'adrenaline', name: 'Adrenaline' }, { slug: 'night-out', name: 'Night Out' }, { slug: 'unique', name: 'Unique' }],
// };

const SUGGESTED_TAGS: Record<CategoryName, Tag[]> = {
  food: [],
  sights: [],
  events: [],
  activities: [],
  nightlife: [],
  other: [],
};

@Component({
  imports: [
    ReactiveFormsModule,
    Divider,
    SearchBar,
    RangeFilter,
    AllCategories,
    TextInput,
    TextField,
    EventCard,
    Button,
    Widget,
    Icon,
    SearchResultTemplate,
  ],
  selector: 'f-post-event',
  styleUrl: './post-event.css',
  templateUrl: './post-event.html',
})
export class PostEvent {
  private fb = inject(FormBuilder);

  protected readonly categoryForm: CategoryForm = (() => {
    const controls = {} as Record<CategoryName, FormControl<boolean>>;
    for (const c of categoriesList) {
      controls[c] = new FormControl(false, { nonNullable: true });
    }
    return new FormGroup(controls);
  })();

  readonly form = this.fb.group({
    images: this.fb.nonNullable.control<UploadedImage[]>([], minItems(1)),
    title: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.maxLength(80),
    ]),
    summary: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.maxLength(200),
    ]),
    description: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.maxLength(1000),
    ]),
    categories: this.categoryForm,
    tags: this.fb.nonNullable.control<Tag[]>([], minItems(3)),
    time: this.fb.nonNullable.control<Range<number>>([11, 15], rangeOrdered),
    price: this.fb.nonNullable.control<Range<number>>([25, 50], rangeOrdered),
    location: this.fb.nonNullable.control('', Validators.required),
  });

  /** Live form value as a signal, drives the preview and derived state. */
  private value = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  readonly previewOpen = signal(false); // mobile "Preview post" toggle

  readonly images = computed(() => this.value().images ?? []);
  readonly selectedTags = computed(() => this.value().tags ?? []);
  readonly suggestedTags = computed(() => {
    const cats = this.value().categories;
    if (!cats) return [];
    const cat = categoriesList.find((c) => cats[c]);
    return cat ? SUGGESTED_TAGS[cat] : [];
  });

  readonly preview = computed<EventDetail>(() => {
    const v = this.value();
    return {
      id: '',
      title: v.title || 'Event Title',
      summary: v.summary || 'Event summary line here',
      time: v.time ? range2Time(v.time) : {},
      price: v.price ? range2Price(v.price) : {},
      location: v.location
        ? { longitude: 0, latitude: 0, name: v.location }
        : 'Event location',
      visits_count: 0,
      review_count: 0,
      rating: 0,
      photos:
        v.images?.map((img, i) => ({
          id: img.id,
          url: img.url,
          is_cover: img.is_cover,
          display_order: i,
        })) ?? [],
      tags: v.tags ?? [],

      creator_id: '',
      description: v.description || 'Event description line here',
      crowd_by_hour: [],
      shares_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
    } as EventDetail;
  });

  /** Show an error only once the field was touched/edited (or after a failed submit). */
  showError(path: string): boolean {
    const c = this.form.get(path);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  // ---- images ----
  onFiles(files: FileList | null) {
    if (!files?.length) return;
    const added = Array.from(files)
      .filter((f) => f.type.startsWith('image/'))
      .map((file) => ({
        id: crypto.randomUUID(),
        file,
        url: URL.createObjectURL(file),
        is_cover: false,
      }));
    const images = [...this.form.controls.images.value, ...added];
    if (!images.find((img) => img.is_cover)) {
      images[0].is_cover = true;
    }
    this.form.controls.images.setValue(images);
    this.form.controls.images.markAsDirty();
  }

  removeImage(img: UploadedImage) {
    URL.revokeObjectURL(img.url);
    const images = this.form.controls.images.value.filter(
      (i) => i.id !== img.id
    );
    if (img.is_cover) {
      images[0].is_cover = true;
    }
    this.form.controls.images.setValue(images);
  }

  setCover(img: UploadedImage) {
    const images = this.form.controls.images.value.map((i) => ({
      ...i,
      is_cover: i.id === img.id,
    }));
    this.form.controls.images.setValue(images);
  }

  toggleTag(t: Tag) {
    const cur = this.form.controls.tags.value;
    this.setTags(
      cur.some((x) => x.slug === t.slug)
        ? cur.filter((x) => x.slug !== t.slug)
        : [...cur, t]
    );
  }

  removeTag(t: Tag) {
    this.setTags(
      this.form.controls.tags.value.filter((x) => x.slug !== t.slug)
    );
  }

  private setTags(tags: Tag[]) {
    this.form.controls.tags.setValue(tags);
    this.form.controls.tags.markAsDirty();
    this.form.controls.tags.markAsTouched();
  }

  protected searchTags: SearchFn<Tag> = async (query) => {
    await new Promise((resolve) => setTimeout(resolve, 300)); // fake latency
    return [
      {
        label: `${query}`,
        value: { id: '1', name: query, slug: query.toLocaleLowerCase() },
      },
      {
        label: `${query} Colors`,
        value: {
          id: '2',
          name: `${query} Colors`,
          slug: `${query.toLocaleLowerCase()}_colors`,
        },
      },
    ];
  };

  protected searchRelatedTags: SearchFn<Tag> = async (query) => {
    return [];
  };

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      document
        .querySelector<HTMLElement>('[data-invalid="true"]')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const { images, ...rest } = this.form.getRawValue();
    const body = new FormData();
    images.forEach((i) => body.append('images', i.file));
    body.append(
      'event',
      JSON.stringify({ ...rest, tags: rest.tags.map((t) => t.slug) })
    );
    // this.events.create(body).subscribe(...)
    console.log('submit', rest);
  }
}
