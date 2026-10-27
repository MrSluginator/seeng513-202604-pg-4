import { forwardRef, Ref, useId } from 'react';
import styles from './text-field.module.css';

interface TextFieldProps {
  label?: string,
  placeholder: string,
  disabled?: boolean,
  id?: string,
}

const TextField = forwardRef(function TextField(
  { label, placeholder, disabled = false, id }: TextFieldProps,
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
        ref={ref as Ref<HTMLTextAreaElement>}
        id={inputId}
        className={styles.input}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  );
});

export default TextField;
