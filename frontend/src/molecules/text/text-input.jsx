import React, { forwardRef, useId } from 'react';
import styles from './text-input.module.css';
import Icon from '../icon';

const TextInput = forwardRef(function TextInput(
  {
    label,
    placeholder,
    icon,
    iconPosition = 'right',
    disabled = false,
    className = '',
    id,
  },
  ref
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  const iconEl = icon ? (
    <span className={styles.icon} aria-hidden="true">
      <Icon name={icon} />
    </span>
  ) : null;

  return (
    <div className={[styles.wrapper, className].filter(Boolean).join(' ')}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}
      <div className={styles.field} data-disabled={disabled || undefined}>
        {iconPosition === 'left' && iconEl}
        <input
          ref={ref}
          id={inputId}
          className={styles.input}
          placeholder={placeholder}
          disabled={disabled}
        />
        {iconPosition === 'right' && iconEl}
      </div>
    </div>
  );
});

export default TextInput;
