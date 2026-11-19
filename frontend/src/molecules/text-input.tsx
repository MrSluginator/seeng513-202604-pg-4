import { forwardRef, Ref, useId } from 'react';
import styles from '../assets/styles/text-input.module.css';
import Icon, { IconName } from './icon';

interface TextInputProps {
  label?: string;
  placeholder?: string;
  icon?: IconName;
  iconPosition?: 'left' | 'right';
  disabled?: boolean;
  id?: string;
  className?: string;
}

const TextInput = forwardRef(function TextInput(
  {
    label,
    placeholder,
    icon,
    iconPosition = 'right',
    disabled = false,
    id,
    className,
  }: TextInputProps,
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
    <div className={`${styles.wrapper} ${className ?? ''}`}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}
      <div className={styles.field} data-disabled={disabled || undefined}>
        {iconPosition === 'left' && iconEl}
        <input
          ref={ref as Ref<HTMLInputElement>}
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
