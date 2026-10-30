import React from 'react';
import styles from '../assets/styles/button.module.css';
import Icon, { IconName } from './icon';

interface ButtonProps {
  onClick: (event: React.MouseEvent) => void;
  text?: string;
  icon?: IconName;
  iconPosition?: 'left' | 'right';
  disabled?: boolean;
  pressed?: boolean;
  label?: string;
}

function Button({
  onClick,
  text,
  icon,
  iconPosition = 'right',
  disabled = false,
  pressed,
  label,
}: ButtonProps) {
  const isToggle = pressed !== undefined;

  return (
    <button
      type="button"
      className={`${styles.button} ${!text ? styles.iconOnly : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={isToggle ? pressed : undefined}
      aria-label={label}
      data-pressed={isToggle ? pressed : undefined}
    >
      {icon && iconPosition === 'left' && <Icon name={icon} fill={pressed}></Icon>}
      {text && <span className={styles.text}>{text}</span>}
      {icon && iconPosition === 'right' && <Icon name={icon} fill={pressed}></Icon>}
    </button>
  );
}

export default Button;