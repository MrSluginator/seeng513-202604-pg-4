import { useId } from 'react';
import styles from '../assets/styles/text-input.module.css';
import Icon, { IconName } from './icon';

interface TextInputProps {
  label?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon?: IconName;
  iconPosition?: 'left' | 'right';
  disabled?: boolean;
  readonly?: boolean;
  id?: string;
  className?: string;
}

function TextInput({
  label,
  placeholder,
  icon,
  iconPosition = 'right',
  disabled = false,
  readonly = false,
  value,
  onChange,
  id,
  className,
}: TextInputProps) {
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
          id={inputId}
          className={styles.input}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readonly}
          value={value}
          onChange={onChange}
        />
        {iconPosition === 'right' && iconEl}
      </div>
    </div>
  );
}

export default TextInput;
