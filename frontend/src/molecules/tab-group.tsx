import React, { useId } from 'react';
import styles from './tab-group.module.css';

interface TabProps {
  value: any;
  label: string;
  disabled?: boolean;
}

interface TabGroupProps {
  options: Array<TabProps>;
  value: any;
  onChange: React.Dispatch<any>;
  id?: string;
  disabled?: boolean;
}

function TabGroup({
  options,
  value,
  onChange,
  id,
  disabled = false,
}: TabGroupProps) {
  const generatedName = useId();
  const groupName = id ?? generatedName;

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
            <span className={styles.label}>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default TabGroup;
