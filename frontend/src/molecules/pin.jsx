import React, { useEffect, useRef } from 'react';
import styles from './pin.module.css';

// The pin's round head is centered at (15.2, 15) in a 31 x 44 viewBox.
const HEAD_CENTER = { x: 15.2, y: 15 }
const VIEWBOX_WIDTH = 31
const VIEWBOX_HEIGHT = 44

// Shrink the font as the number gets longer so it stays inside the head.
function fontSizeFor(text) {
	if (text.length <= 2) return 14
	if (text.length === 3) return 11
	return 9
}

function Pin({
	number,
	size = 31,
	label,
	selected = false,
	onClick,
	onDeselect,
	className = '',
	...buttonProps // disabled, onFocus, etc. (only used when clickable)
}) {
	const hasNumber = number !== undefined && number !== null && number !== '';
	const text = hasNumber ? String(number) : '';
	const ariaLabel = label ?? (hasNumber ? `Pin ${text}` : 'Pin');
	const buttonRef = useRef(null);

	useEffect(() => {
		if (!selected || !onDeselect) return undefined

		function handlePointerDown(event) {
			if (buttonRef.current && !buttonRef.current.contains(event.target)) {
				onDeselect(event)
			}
		}

		document.addEventListener('pointerdown', handlePointerDown)
		return () => document.removeEventListener('pointerdown', handlePointerDown)
	}, [selected, onDeselect])

	const svg = (
		<svg
			className={styles.pin}
			viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
			width={size}
			height={(size * VIEWBOX_HEIGHT) / VIEWBOX_WIDTH}
			// When clickable, the button carries the label and the SVG is decorative
			{...{ 'aria-hidden': true }}
		>
			<path
				className={styles.shape}
				d="M26.1956 24.6783L15.2004 41.2L4.20515 24.6783C-0.935479 16.1278 -0.792702 1.20001 15.2004 1.20001C31.1935 1.20001 31.3362 16.1278 26.1956 24.6783Z"
			/>
			{hasNumber && (
				<text
					className={styles.number}
					x={HEAD_CENTER.x}
					y={HEAD_CENTER.y}
					fontSize={fontSizeFor(text)}
					textAnchor="middle"
					dominantBaseline="central"
				>
					{text}
				</text>
			)}
		</svg>
	)

	return (
		<button
			type="button"
			className={styles.button}
			aria-label={ariaLabel}
			aria-pressed={selected}
			onClick={onClick}
			{...buttonProps}
		>
			{svg}
		</button>
	)
}

export default Pin;