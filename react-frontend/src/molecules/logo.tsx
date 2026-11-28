import flareLogo1 from '../assets/icons/flare-logo-1.svg?react';
import styles from '../assets/styles/logo.module.css';
import { Color, Size } from '../types';

interface LogoProps {
  size: Size;
  color?: Color;
}

function Logo({ size = 'xl', color }: LogoProps) {
  const SvgIcon = flareLogo1;

  if (!SvgIcon) {
    return null;
  }

  const resolvedColor = `var(--${color})`;
  const resolvedSize = `var(--logo-${size})`;

  return (
    <div className={styles.logo}>
      <SvgIcon
        style={{
          color: color ? resolvedColor : undefined,
          flexShrink: 0,
          width: 'auto',
          height: resolvedSize,
        }}
        role={'img'}
        aria-label={'flare logo'}
      />
    </div>
  );
}

export default Logo;
