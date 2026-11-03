import bookmark from '../assets/icons/bookmark.svg?react';
import check from '../assets/icons/check.svg?react';
import clock from '../assets/icons/clock.svg?react';
import comment from '../assets/icons/comment.svg?react';
import dollar from '../assets/icons/dollar.svg?react';
import down from '../assets/icons/down.svg?react';
import event from '../assets/icons/event.svg?react';
import eyeClosed from '../assets/icons/eye-closed.svg?react';
import eyeOpen from '../assets/icons/eye-open.svg?react';
import filter from '../assets/icons/filter.svg?react';
import food from '../assets/icons/food.svg?react';
import home from '../assets/icons/home.svg?react';
import info from '../assets/icons/info.svg?react';
import left from '../assets/icons/left.svg?react';
import load from '../assets/icons/load.svg?react';
import map from '../assets/icons/map.svg?react';
import park from '../assets/icons/park.svg?react';
import pin from '../assets/icons/pin.svg?react';
import plus from '../assets/icons/plus.svg?react';
import profile from '../assets/icons/profile.svg?react';
import right from '../assets/icons/right.svg?react';
import search from '../assets/icons/search.svg?react';
import settings from '../assets/icons/settings.svg?react';
import share from '../assets/icons/share.svg?react';
import spark from '../assets/icons/spark.svg?react';
import sun from '../assets/icons/sun.svg?react';
import times from '../assets/icons/times.svg?react';
import up from '../assets/icons/up.svg?react';
import wine from '../assets/icons/wine.svg?react';
import { Color, Size } from '../global';

const icons = {
  bookmark: bookmark,
  check: check,
  clock: clock,
  comment: comment,
  dollar: dollar,
  down: down,
  event: event,
  eyeClosed: eyeClosed,
  eyeOpen: eyeOpen,
  filter: filter,
  food: food,
  home: home,
  info: info,
  left: left,
  load: load,
  map: map,
  park: park,
  pin: pin,
  plus: plus,
  profile: profile,
  right: right,
  search: search,
  settings: settings,
  share: share,
  spark: spark,
  sun: sun,
  times: times,
  up: up,
  wine: wine,
};

export type IconName = keyof typeof icons;

interface IconProps {
  name: IconName;
  size?: Size;
  color?: Color;
  fill?: boolean;
}

function Icon({ name, size = 'xs', color, fill = false }: IconProps) {
  const SvgIcon = icons[name];

  if (!SvgIcon) {
    return null;
  }

  const resolvedColor = `var(--${color})`;
  const resolvedSize = `var(--icon-${size})`;

  return (
    <SvgIcon
      style={{
        color: color ? resolvedColor : undefined,
        fill: fill ? 'currentColor' : undefined,
        flexShrink: 0,
        width: resolvedSize,
        height: resolvedSize,
      }}
      role={'img'}
      aria-label={name}
    />
  );
}

export default Icon;
