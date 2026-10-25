import React from 'react'

const baseStyle = {
  padding: '8px 16px',
  cursor: 'pointer',
};

function Button({ onClick, disabled = false, leftIcon, text, icon, style }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            style={baseStyle}
        >
            {leftIcon && leftIcon}
            {text && text}
            {icon && icon}
        </button>
    );
}

export default Button;