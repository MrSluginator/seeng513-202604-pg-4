import { useState } from 'react';
import styles from '../assets/styles/range-filter.module.css';
import Slider, { SliderProps } from '../molecules/slider';
import { TextInput, ToggleButton } from '../molecules';

function RangeFilter({
  defaultEnabled,
  lowLabel,
  highLabel,
  format,
  slider,
  onChange,
}: {
  defaultEnabled: boolean;
  lowLabel: string;
  highLabel: string;
  format: (value: number) => string;
  slider: SliderProps<[number, number]>;
  onChange?: (range: [number, number] | null) => void;
}) {
  const [enabled, setEnabled] = useState(defaultEnabled);
  const [[low, high], setRange] = useState<[number, number]>(
    slider.defaultValue
  );

  const handleToggle = (next: boolean) => {
    setEnabled(next);
    onChange?.(next ? [low, high] : null);
  };

  const handleSlide = (next: [number, number]) => {
    setRange(next);
    if (enabled) onChange?.(next);
  };

  return (
    <div className={styles.rangeFilter} aria-disabled={!enabled}>
      <ToggleButton pressed={enabled} onChange={handleToggle} />
      <div className={styles.content}>
        <TextInput
          className={styles.input}
          label={lowLabel}
          value={format(low)}
          readonly
          disabled={!enabled}
        />
        <Slider {...slider} onChange={handleSlide} disabled={!enabled} />
        <TextInput
          className={styles.input}
          label={highLabel}
          value={format(high)}
          readonly
          disabled={!enabled}
        />
      </div>
    </div>
  );
}

export default RangeFilter;
