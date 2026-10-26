import React from 'react'
import styles from './button.module.css'
import Icon from '../icon';

function Button({ onClick, text, icon, icon_position = "right", disabled = false, variant = 'primary' }) {
    return (
        <button
            className={`${styles.button} ${!text ? styles.iconOnly : ""}`}
            onClick={onClick}
            disabled={disabled}
        >
            {(icon && icon_position === "left") && <Icon name={icon}></Icon>}
            {text && <span className={styles.text}>{text}</span>}
            {(icon && icon_position === "right") && <Icon name={icon}></Icon>}
        </button>
    );
}

export default Button;