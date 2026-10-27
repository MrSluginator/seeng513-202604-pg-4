import React, { useId } from 'react';
import styles from './radio-group.module.css';

interface RadioProps {
  value: any,
  label: string,
  disabled?: boolean
}

interface RadioGroupProps {
  options: Array<RadioProps>,
  value: any,
  onChange: React.Dispatch<any>,
  disabled?: boolean
  id?: string,
}

function RadioGroup({ options, value, onChange, disabled = false, id: name }: RadioGroupProps) {
  const generatedName = useId();
  const groupName = name ?? generatedName;

  return (
    <fieldset className={styles.group} disabled={disabled}>
      <div className={styles.options}>
        {options.map((option) => (
          <label
            key={option.value}
            className={`${styles.option} ${option.disabled || disabled ? styles.optionDisabled : ''}`}
          >
            <input
              type="radio"
              className={styles.input}
              name={groupName}
              value={option.value}
              checked={value === option.value}
              disabled={option.disabled}
              onChange={() => onChange?.(option.value)}
            />
            <span className={styles.circle}>
              <span className={styles.dot} />
            </span>
            <span className={styles.label}>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default RadioGroup;