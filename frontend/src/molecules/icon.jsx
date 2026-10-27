import React from "react";
import bookmark from "../assets/icons/bookmark.svg?react";
import check from "../assets/icons/check.svg?react";
import comment from "../assets/icons/comment.svg?react";
import dollar from "../assets/icons/dollar.svg?react";
import down from "../assets/icons/down.svg?react";
import event from "../assets/icons/event.svg?react";
import eyeClosed from "../assets/icons/eye-closed.svg?react";
import eyeOpen from "../assets/icons/eye-open.svg?react";
import filter from "../assets/icons/filter.svg?react";
import food from "../assets/icons/food.svg?react";
import home from "../assets/icons/home.svg?react";
import info from "../assets/icons/info.svg?react";
import left from "../assets/icons/left.svg?react";
import load from "../assets/icons/load.svg?react";
import map from "../assets/icons/map.svg?react";
import park from "../assets/icons/park.svg?react";
import plus from "../assets/icons/plus.svg?react";
import profile from "../assets/icons/profile.svg?react";
import right from "../assets/icons/right.svg?react";
import search from "../assets/icons/search.svg?react";
import settings from "../assets/icons/settings.svg?react";
import share from "../assets/icons/share.svg?react";
import spark from "../assets/icons/spark.svg?react";
import sun from "../assets/icons/sun.svg?react";
import times from "../assets/icons/times.svg?react";
import up from "../assets/icons/up.svg?react";
import wine from "../assets/icons/wine.svg?react";


const icons = {
    "bookmark": bookmark,
    "check": check,
    "comment": comment,
    "dollar": dollar,
    "down": down,
    "event": event,
    "eye-closed": eyeClosed,
    "eye-open": eyeOpen,
    "filter": filter,
    "food": food,
    "home": home,
    "info": info,
    "left": left,
    "load": load,
    "map": map,
    "park": park,
    "plus": plus,
    "profile": profile,
    "right": right,
    "search": search,
    "settings": settings,
    "share": share,
    "spark": spark,
    "sun": sun,
    "times": times,
    "up": up,
    "wine": wine,
};

function Icon({ name, size = "xs", color = "n7", title }) {
  const SvgIcon = icons[name];

  if (!SvgIcon) {
    // console.warn(`Icon: no icon named "${name}"`);
    return null;
  }

  const resolvedColor = /^(#|rgb|hsl|var\(|currentColor)/.test(color)
    ? color
    : `var(--${color})`;
  const resolvedSize = /^[0-9]/.test(size) ? size : `var(--icon-${size})`

  return (
    <SvgIcon
      width={resolvedSize}
      height={resolvedSize}
      style={{ color: resolvedColor, flexShrink: 0 }}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    />
  );
}

export default Icon;