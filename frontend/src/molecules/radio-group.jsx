import React, { useId } from "react";
import styles from "./radio-group.module.css";

/**
 * RadioGroup
 *
 * Built on native <input type="radio">, so the browser provides the correct
 * behaviour for free: one Tab stop for the group, arrow keys move the
 * selection, and screen readers announce "radio button, 2 of 3".
 *
 * Props:
 *  - options   : [{ value: "sm", label: "Small", disabled?: true }, ...]
 *  - value     : the currently selected value (controlled)
 *  - onChange  : called with the newly selected value
 *  - name      : optional; a unique one is generated if you leave it out
 *  - disabled  : disables every option
 */
function RadioGroup({
	options,
	value,
	onChange,
	name,
	disabled = false,
}) {
	const generatedName = useId();
	const groupName = name ?? generatedName;

	return (
		<fieldset className={styles.group} disabled={disabled}>
			<div className={styles.options}>
				{options.map((option) => (
					<label
						key={option.value}
						className={`${styles.option} ${option.disabled || disabled ? styles.optionDisabled : ""}`}
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

/* ---------- Example usage ----------

import RadioGroup from "./RadioGroup";

const [size, setSize] = useState("md");

<RadioGroup
  legend="Pick a size"
  value={size}
  onChange={setSize}
  options={[
	{ value: "sm", label: "Small" },
	{ value: "md", label: "Medium" },
	{ value: "lg", label: "Large" },
	{ value: "xl", label: "Extra large", disabled: true },
  ]}
/>

-------------------------------------- */