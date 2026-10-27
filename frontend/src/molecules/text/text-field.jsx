import React, { forwardRef, useId } from 'react';
import styles from './text-field.module.css';
import Icon from '../icon';

const TextField = forwardRef(function TextField(
  { label, placeholder, disabled = false, id },
  ref
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className={styles.wrapper}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={inputId}
        className={styles.input}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  );
});

export default TextField;
