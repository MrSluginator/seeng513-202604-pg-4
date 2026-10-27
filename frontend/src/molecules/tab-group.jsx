import {React, useId} from 'react'
import styles from "./tab-group.module.css";

function TabGroup({
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
						<span className={styles.label}>{option.label}</span>
					</label>
				))}
			</div>
		</fieldset>
	);
}

export default TabGroup;