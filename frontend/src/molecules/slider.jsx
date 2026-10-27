import React, { useRef, useState } from 'react';
import styles from './slider.module.css';

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

/**
 * Slider
 *
 * Single value:  <Slider defaultValue={14} />
 * Range:         <Slider defaultValue={[10, 18]} />
 * Controlled:    <Slider value={v} onChange={setV} />
 * Labels on top: <Slider labelsPosition="top" />
 */
function Slider({
  min = 0,
  max = 100,
  step = 1,
  value,
  defaultValue = 25,
  onChange,
  majorSteps = 5, // number of labeled ticks
  minorSteps = 4, // number of small ticks between each labeled tick
  labelsPosition = 'bottom', // 'bottom' | 'top'
  formatLabel = (v) => v,
  ariaLabel = 'Slider',
}) {
  const isControlled = value !== undefined;
  const [inner, setInner] = useState(defaultValue);
  const current = isControlled ? value : inner;

  const isRange = Array.isArray(current);
  const values = isRange ? [...current].sort((a, b) => a - b) : [current];

  const railRef = useRef(null);
  const activeIndex = useRef(null);
  const [dragging, setDragging] = useState(null);

  const toPercent = (v) => ((v - min) / (max - min)) * 100;
  const snap = (v) =>
    clamp(Math.round((v - min) / step) * step + min, min, max);

  const commit = (index, next) => {
    // a thumb can't cross its neighbour
    const lo = isRange && index === 1 ? values[0] : min;
    const hi = isRange && index === 0 ? values[1] : max;
    const arr = [...values];
    arr[index] = clamp(next, lo, hi);
    if (arr[index] === values[index]) return;
    const out = isRange ? arr : arr[0];
    if (!isControlled) setInner(out);
    if (onChange) onChange(out);
  };

  const valueFromPointer = (e) => {
    const rect = railRef.current.getBoundingClientRect();
    const ratio = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    return snap(min + ratio * (max - min));
  };

  const handlePointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    const v = valueFromPointer(e);

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

  const handlePointerMove = (e) => {
    if (activeIndex.current === null) return;
    commit(activeIndex.current, valueFromPointer(e));
  };

  const endDrag = () => {
    activeIndex.current = null;
    setDragging(null);
  };

  const majorStep = (max - min) / (majorSteps - 1);

  const handleKeyDown = (index) => (e) => {
    const v = values[index];
    const keys = {
      ArrowRight: v + step,
      ArrowUp: v + step,
      ArrowLeft: v - step,
      ArrowDown: v - step,
      PageUp: v + majorStep,
      PageDown: v - majorStep,
      Home: min,
      End: max,
    };
    if (!(e.key in keys)) return;
    e.preventDefault();
    commit(index, snap(keys[e.key]));
  };

  // ticks
  const ticks = [];
  for (let i = 0; i < majorSteps; i++) {
    const v = min + i * majorStep;
    ticks.push({ v: v, major: true });
    if (i < majorSteps - 1) {
      for (let j = 1; j <= minorSteps; j++) {
        ticks.push({ v: v + (j * majorStep) / (minorSteps + 1), major: false });
      }
    }
  }

  const inset = 'var(--slider-inset)';
  const inRail = (pct) =>
    `calc(${inset} + (100% - 2 * ${inset}) * ${pct / 100})`;
  const fillStart = isRange ? toPercent(values[0]) : 0;
  const fillEnd = toPercent(values[values.length - 1]);
  const fillStyle = {
    left: isRange ? inRail(fillStart) : 0,
    right: inRail(100 - fillEnd),
  };

  return (
    <div className={styles.slider} data-labels={labelsPosition}>
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
            {ticks.map(({ v, major }) => (
              <span key={v} className={styles.tick} data-major={major} />
            ))}
          </div>

          <div className={styles.labels} aria-hidden="true">
            {ticks
              .filter((t) => t.major)
              .map(({ v }) => (
                <span
                  key={v}
                  className={styles.label}
                  style={{ left: `${toPercent(v)}%` }}
                >
                  {formatLabel(v)}
                </span>
              ))}
          </div>

          {values.map((v, i) => (
            <div
              key={i}
              className={styles.thumb}
              role="slider"
              tabIndex={0}
              aria-label={
                isRange
                  ? `${ariaLabel} ${i === 0 ? 'start' : 'end'}`
                  : ariaLabel
              }
              aria-valuemin={min}
              aria-valuemax={max}
              aria-valuenow={v}
              aria-orientation="horizontal"
              data-dragging={dragging === i}
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
