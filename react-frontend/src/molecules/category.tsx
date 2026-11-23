import { ColorGroup } from '../types';
import { IconName } from './icon';
import Widget from './widget';
import styles from '../assets/styles/category.module.css';

interface CategoryProps {
  text: string;
  icon: IconName;
  color: ColorGroup;
}

const categories = {
  food: { text: 'Food', icon: 'food', color: 'p' },
  sights: { text: 'Sights', icon: 'sun', color: 'o' },
  events: { text: 'Events', icon: 'event', color: 'b' },
  activities: { text: 'Activities', icon: 'park', color: 'g' },
  nightlife: { text: 'Nightlife', icon: 'wine', color: 's' },
  other: { text: 'Exciting', icon: 'load', color: 'y' },
} satisfies Record<string, CategoryProps>;

export type Category = keyof typeof categories;

export function AllCategories({
  active,
  onToggle,
}: {
  active: Array<Category>;
  onToggle: (category: Category, pressed: boolean) => void;
}) {
  return (
    <>
      {(Object.keys(categories) as Category[]).map((key) => (
        <CategoryWidget
          key={key}
          category={key}
          pressed={active.includes(key)}
          onChange={(next) => onToggle(key, next)}
        />
      ))}
    </>
  );
}
function CategoryWidget({
  category,
  pressed,
  onChange,
}: {
  category: Category;
  pressed: boolean;
  onChange: (next: boolean) => void;
}) {
  const { text, icon, color } = categories[category];
  return (
    <Widget
      pressed={pressed}
      onChange={onChange}
      text={text}
      icon={icon}
      iconPosition="top"
      className={styles[color]}
    />
  );
}

export default CategoryWidget;
