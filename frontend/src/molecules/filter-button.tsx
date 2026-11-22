import { useState } from 'react';
import { FilterDialog } from '../dialogs';
import { FilterProps } from '../dialogs/filter-dialog';
import Button from './button';

function FilterButton({
  filters,
  onApply,
}: {
  filters?: FilterProps;
  onApply: (filters: FilterProps) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button icon="filter" onClick={() => setOpen(true)} />
      <FilterDialog
        isOpen={open}
        onClose={() => setOpen(false)}
        onApply={onApply}
        initial={filters}
      />
    </>
  );
}

export default FilterButton;
