import React, { useRef, useState } from 'react';
import styles from './slider.module.css';

type RangeValue = [number, number];
type SliderValue = number | RangeValue;

export interface SliderProps<T extends SliderValue = SliderValue> {
  min: number;
  max: number;
  step?: number;
  defaultValue: T;
  value?: T;
  onChange?: (value: T) => void;
  disabled?: boolean;
  /** Number of labeled ticks (minimum 2). */
  majorSteps?: number;
  /** Number of small ticks between each labeled tick. */
  minorSteps?: number;
  labelsPosition?: 'bottom' | 'top';
  formatLabel?: (value: number) => string;
  /** Accessible name for the slider. */
  label?: string;
}

interface Tick {
  value: number;
  major: boolean;
}

const INSET = 'var(--slider-inset)';

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

const inRail = (percent: number) =>
  `calc(${INSET} + (100% - 2 * ${INSET}) * ${percent / 100})`;

function buildTicks(
  min: number,
  majorStep: number,
  majorSteps: number,
  minorSteps: number,
): Tick[] {
  const ticks: Tick[] = [];
  for (let i = 0; i < majorSteps; i += 1) {
    const value = min + i * majorStep;
    ticks.push({ value, major: true });

    if (i < majorSteps - 1) {
      for (let j = 1; j <= minorSteps; j += 1) {
        ticks.push({ value: value + (j * majorStep) / (minorSteps + 1), major: false });
      }
    }
  }
  return ticks;
}

function Slider<T extends SliderValue>({
  min,
  max,
  step = 1,
  defaultValue,
  value,
  onChange,
  disabled = false,
  majorSteps: majorStepsProp = 5,
  minorSteps = 4,
  labelsPosition = 'bottom',
  formatLabel = String,
  label = 'Slider',
}: SliderProps<T>) {
  const majorSteps = Math.max(2, majorStepsProp); // avoids divide-by-zero below

  const isControlled = value !== undefined;
  const [inner, setInner] = useState<SliderValue>(defaultValue);
  const current: SliderValue = isControlled ? value : inner;

  const isRange = typeof current !== 'number';
  const values: number[] =
    typeof current === 'number' ? [current] : [...current].sort((a, b) => a - b);

  const railRef = useRef<HTMLDivElement>(null);
  const activeIndex = useRef<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);

  const majorStep = (max - min) / (majorSteps - 1);

  const toPercent = (v: number) => ((v - min) / (max - min)) * 100;
  const snap = (v: number) => clamp(Math.round((v - min) / step) * step + min, min, max);

  const commit = (index: number, next: number) => {
    if (disabled) return;

    // a thumb can't cross its neighbour
    const lo = isRange && index === 1 ? values[0] : min;
    const hi = isRange && index === 0 ? values[1] : max;
    const clamped = clamp(next, lo, hi);
    if (clamped === values[index]) return;

    const arr = [...values];
    arr[index] = clamped;
    const out: SliderValue = isRange ? [arr[0], arr[1]] : arr[0];

    if (!isControlled) setInner(out);
    // `out` has the same shape as `defaultValue`, which is what T was inferred from.
    onChange?.(out as T);
  };

  const valueFromClientX = (clientX: number): number | null => {
    const rail = railRef.current;
    if (!rail) return null;
    const rect = rail.getBoundingClientRect();
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
    return snap(min + ratio * (max - min));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || e.button !== 0) return;
    const v = valueFromClientX(e.clientX);
    if (v === null) return;

    let index = 0;
    if (isRange) {
      const d0 = Math.abs(v - values[0]);
      const d1 = Math.abs(v - values[1]);
      index = d0 < d1 || (d0 === d1 && v < values[0]) ? 0 : 1;
    }

    activeIndex.current = index;
    setDragging(index);
    e.currentTarget.setPointerCapture(e.pointerId);
    commit(index, v);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || activeIndex.current === null) return;
    const v = valueFromClientX(e.clientX);
    if (v !== null) commit(activeIndex.current, v);
  };

  const endDrag = () => {
    activeIndex.current = null;
    setDragging(null);
  };

  const handleKeyDown = (index: number) => (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;

    const v = values[index];
    const targets: Partial<Record<string, number>> = {
      ArrowRight: v + step,
      ArrowUp: v + step,
      ArrowLeft: v - step,
      ArrowDown: v - step,
      PageUp: v + majorStep,
      PageDown: v - majorStep,
      Home: min,
      End: max,
    };

    const target = targets[e.key];
    if (target === undefined) return;
    e.preventDefault();
    commit(index, snap(target));
  };

  const ticks = buildTicks(min, majorStep, majorSteps, minorSteps);

  const fillStart = isRange ? toPercent(values[0]) : 0;
  const fillEnd = toPercent(values[values.length - 1]);
  const fillStyle: React.CSSProperties = {
    left: isRange ? inRail(fillStart) : 0,
    right: inRail(100 - fillEnd),
  };

  return (
    <div
      className={styles.slider}
      data-labels={labelsPosition}
      data-disabled={disabled}
    >
      <div
        className={styles.rail}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div className={styles.track} />
        <div className={styles.fill} style={fillStyle} />
        <div className={styles.inset} ref={railRef}>
          <div className={styles.ticks} aria-hidden="true">
            {ticks.map(({ major }, i) => (
              <span key={i} className={styles.tick} data-major={major} />
            ))}
          </div>

          <div className={styles.labels} aria-hidden="true">
            {ticks
              .filter((t) => t.major)
              .map(({ value: v }, i) => (
                <span key={i} className={styles.label} style={{ left: `${toPercent(v)}%` }}>
                  {formatLabel(v)}
                </span>
              ))}
          </div>

          {values.map((v, i) => (
            <div
              key={i}
              className={styles.thumb}
              role="slider"
              tabIndex={disabled ? -1 : 0}
              aria-label={isRange ? `${label} ${i === 0 ? 'start' : 'end'}` : label}
              aria-valuemin={min}
              aria-valuemax={max}
              aria-valuenow={v}
              aria-valuetext={formatLabel(v)}
              aria-orientation="horizontal"
              aria-disabled={disabled}
              data-dragging={!disabled && dragging === i}
              style={{ left: `${toPercent(v)}%` }}
              onKeyDown={handleKeyDown(i)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default Slider;