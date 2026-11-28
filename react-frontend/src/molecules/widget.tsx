import React, { useState } from 'react';
import styles from '../assets/styles/widget.module.css';
import Icon, { IconName } from './icon';

interface WidgetProps {
  text?: string;
  icon?: IconName;
  iconPosition?: 'left' | 'right' | 'top' | 'bottom';
  defaultPressed?: boolean;
  pressed?: any;
  onChange?: React.Dispatch<any>;
  disabled?: boolean;
  label?: string;
  className?: string;
}

function Widget({
  text,
  icon,
  iconPosition = 'right',
  pressed,
  defaultPressed = false,
  onChange,
  disabled = false,
  label,
  className,
}: WidgetProps) {
  const [internalPressed, setInternalPressed] = useState(defaultPressed);

  const isControlled = pressed !== undefined;
  const isPressed = isControlled ? pressed : internalPressed;

  function handleClick() {
    const next = !isPressed;
    if (!isControlled) setInternalPressed(next);
    onChange?.(next);
  }

  const bigget = iconPosition === 'top' || iconPosition === 'bottom';
  const first = iconPosition === 'top' || iconPosition === 'left';
  const iconEl = icon ? <Icon name={icon} /> : null;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isPressed}
      aria-label={label}
      className={`${styles.widget} ${bigget ? styles.bigget : ''} ${className ?? ''}`}
      onClick={handleClick}
      disabled={disabled}
    >
      {first && iconEl}
      {text}
      {!first && iconEl}
    </button>
  );
}

export default Widget;
