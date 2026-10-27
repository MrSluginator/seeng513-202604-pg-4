import React, { useState } from "react";
import styles from "./toggle-button.module.css";

/**
 * ToggleButton (on/off switch)
 *
 * Works two ways:
 *  - Uncontrolled: it keeps its own on/off state. Optionally set defaultPressed.
 *  - Controlled:   pass `pressed` and `onChange` and you own the state.
 *
 * Props:
 *  - pressed              : controlled on/off value
 *  - defaultPressed       : starting value when uncontrolled (default false)
 *  - onChange(nextValue)  : called with the new true/false value
 *  - disabled             : disables the switch
 *  - label                : accessible name, e.g. "Dark mode" (there is no visible text)
 */
function ToggleButton({
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
      className={styles.toggle}
      onClick={handleClick}
      disabled={disabled}
    >
      <span className={styles.circle} />
    </button>
  );
}

export default ToggleButton;

/* ---------- Example usage ----------

// Uncontrolled
<ToggleButton label="Dark mode" />

// Controlled
const [on, setOn] = useState(false);
<ToggleButton label="Notifications" pressed={on} onChange={setOn} />

-------------------------------------- */