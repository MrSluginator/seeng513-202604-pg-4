import React, { useEffect, useRef } from 'react';
import styles from './pin.module.css';
import { Size as PinSize } from '../global';

const HEAD_CENTER = { x: 15.2, y: 15 };
const VIEWBOX_WIDTH = 31;
const VIEWBOX_HEIGHT = 44;

interface PinProps {
  number?: number;
  size?: PinSize;
  label?: string;
  selected?: boolean;
  disabled?: boolean;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  onDeselect?: (event: PointerEvent) => void;
}

function Pin({
  number,
  size = 's',
  label,
  selected = false,
  disabled = false,
  onClick,
  onDeselect,
}: PinProps) {
  const hasNumber = number !== undefined;
  const text = hasNumber ? String(number) : '';
  const ariaLabel = label ?? (hasNumber ? `Pin ${text}` : 'Pin');
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!selected || !onDeselect) return undefined;

    function handlePointerDown(event: PointerEvent) {
      if (buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        onDeselect?.(event);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [selected, onDeselect]);

  return (
    <button
      ref={buttonRef}
      type="button"
      className={styles.button}
      aria-label={ariaLabel}
      aria-pressed={selected}
      onClick={onClick}
      disabled={disabled}
    >
      <svg
        className={styles.pin}
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        style={{width: `var(--pin-${size})`, height: `calc(var(--pin-${size}) * ${VIEWBOX_HEIGHT} / ${VIEWBOX_WIDTH})`}}
        aria-hidden="true"
      >
        <path
          className={styles.shape}
          d="M26.1956 24.6783L15.2004 41.2L4.20515 24.6783C-0.935479 16.1278 -0.792702 1.20001 15.2004 1.20001C31.1935 1.20001 31.3362 16.1278 26.1956 24.6783Z"
        />
        {hasNumber && (
          <text
            className={styles.number}
            x={HEAD_CENTER.x}
            y={HEAD_CENTER.y}
            textAnchor="middle"
            dominantBaseline="central"
          >
            {text}
          </text>
        )}
      </svg>
    </button>
  );
}

export default Pin;