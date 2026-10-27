import React from 'react';
import styles from './button.module.css';
import Icon, { IconName } from '../icon';

interface ButtonProps {
  onClick: (event: React.MouseEvent) => void,
  text?: string,
  icon?: IconName,
  iconPosition: 'left' | 'right',
  disabled: boolean,
}

function Button({
  onClick,
  text,
  icon,
  iconPosition = 'right',
  disabled = false,
}: ButtonProps) {
  return (
    <button
      className={`${styles.button} ${!text ? styles.iconOnly : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      {icon && iconPosition === 'left' && <Icon name={icon}></Icon>}
      {text && <span className={styles.text}>{text}</span>}
      {icon && iconPosition === 'right' && <Icon name={icon}></Icon>}
    </button>
  );
}

export default Button;
