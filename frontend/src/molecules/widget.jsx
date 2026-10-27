import React, { useState } from "react";
import styles from "./widget.module.css";
import Icon from "./icon";

function Widget({
    text,
    icon,
    pressed,
    defaultPressed = false,
    onChange,
    disabled = false,
    label,
}) {
    const [internalPressed, setInternalPressed] = useState(defaultPressed);

    const isControlled = pressed !== undefined;
    const isPressed = isControlled ? pressed : internalPressed;

    function handleClick() {
        const next = !isPressed;
        if (!isControlled) setInternalPressed(next);
        onChange?.(next);
    }

    return (
        <button
            type="button"
            role="switch"
            aria-checked={isPressed}
            aria-label={label}
            className={`${styles.widget} ${(icon && text) ? styles.bigget : ''}`}
            onClick={handleClick}
            disabled={disabled}
        >
            {icon && <Icon name={icon}/>}
            {text}
        </button>
    );
}

export default Widget;