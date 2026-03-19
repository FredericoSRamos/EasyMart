import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import * as fc from 'fast-check';
import SortControl, { SORT_OPTIONS } from '../../components/SortControl';

const sortOptionArb = fc.constantFrom(...SORT_OPTIONS);

describe('passes ordering param to onChange', () => {
  it('calls onChange with the selected option value', () => {
    fc.assert(
      fc.property(sortOptionArb, sortOptionArb, (initial, selected) => {
        const onChange = vi.fn();
        const { container, unmount } = render(
          <SortControl value={initial.value} onChange={onChange} />
        );
        const select = container.querySelector('select') as HTMLSelectElement;
        fireEvent.change(select, { target: { value: selected.value } });
        expect(onChange).toHaveBeenCalledWith(selected.value);
        unmount();
      }),
      { numRuns: 100 }
    );
  });
});

describe('displays active sort label', () => {
  it('selected option text matches the label for the given value', () => {
    fc.assert(
      fc.property(sortOptionArb, (option) => {
        const { container, unmount } = render(
          <SortControl value={option.value} onChange={() => {}} />
        );
        const select = container.querySelector('select') as HTMLSelectElement;
        expect(select.value).toBe(option.value);
        const selectedOption = select.options[select.selectedIndex];
        expect(selectedOption.text).toBe(option.label);
        unmount();
      }),
      { numRuns: 100 }
    );
  });
});

describe('SortControl unit tests', () => {
  it('renders a select element with all SORT_OPTIONS', () => {
    const { container } = render(<SortControl value="price" onChange={() => {}} />);
    const select = container.querySelector('select') as HTMLSelectElement;
    expect(select).not.toBeNull();
    expect(select.options).toHaveLength(SORT_OPTIONS.length);
  });

  it('each option has the correct value and label', () => {
    const { container } = render(<SortControl value="price" onChange={() => {}} />);
    const select = container.querySelector('select') as HTMLSelectElement;
    SORT_OPTIONS.forEach((opt, i) => {
      expect(select.options[i].value).toBe(opt.value);
      expect(select.options[i].text).toBe(opt.label);
    });
  });

  it('reflects the value prop as the selected option', () => {
    const { container } = render(<SortControl value="-price" onChange={() => {}} />);
    const select = container.querySelector('select') as HTMLSelectElement;
    expect(select.value).toBe('-price');
  });

  it('calls onChange with the new value when selection changes', () => {
    const onChange = vi.fn();
    const { container } = render(<SortControl value="price" onChange={onChange} />);
    const select = container.querySelector('select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'name' } });
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith('name');
  });

  it('calls onChange with "-name" when that option is selected', () => {
    const onChange = vi.fn();
    const { container } = render(<SortControl value="price" onChange={onChange} />);
    const select = container.querySelector('select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '-name' } });
    expect(onChange).toHaveBeenCalledWith('-name');
  });
});
