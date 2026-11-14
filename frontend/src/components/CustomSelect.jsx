import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

const OPTION_HEIGHT = 36;
const MENU_PADDING = 10;

export default function CustomSelect({ value, options, onChange, className = '', ariaLabel }) {
  const id = useId();
  const rootRef = useRef(null);
  const menuRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [position, setPosition] = useState(null);
  const selectedIndex = Math.max(0, options.findIndex(option => option.value === value));
  const selectedOption = options[selectedIndex];

  const updatePosition = () => {
    const trigger = rootRef.current?.getBoundingClientRect();
    if (!trigger) return;

    const desiredHeight = Math.min(280, options.length * OPTION_HEIGHT + MENU_PADDING);
    const spaceBelow = window.innerHeight - trigger.bottom - 8;
    const spaceAbove = trigger.top - 8;
    const placeAbove = spaceBelow < Math.min(desiredHeight, 180) && spaceAbove > spaceBelow;
    const availableHeight = Math.max(100, placeAbove ? spaceAbove : spaceBelow);
    const height = Math.min(desiredHeight, availableHeight);

    setPosition({
      left: Math.max(8, Math.min(trigger.left, window.innerWidth - trigger.width - 8)),
      top: placeAbove ? Math.max(8, trigger.top - height - 6) : trigger.bottom + 6,
      width: Math.min(trigger.width, window.innerWidth - 16),
      maxHeight: height,
      theme: ['paper', 'ink', 'line', 'soft', 'lav'].reduce((variables, name) => {
        variables[`--${name}`] = getComputedStyle(rootRef.current).getPropertyValue(`--${name}`).trim();
        return variables;
      }, {})
    });
  };

  useLayoutEffect(() => {
    if (!open) return undefined;
    updatePosition();
    const reposition = () => updatePosition();
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [open, options.length]);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsideClick = event => {
      if (!rootRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, [open]);

  const openMenu = index => {
    setActiveIndex(index);
    setOpen(true);
  };

  const chooseOption = option => {
    onChange(option.value);
    setOpen(false);
  };

  const handleKeyDown = event => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      if (!open) {
        openMenu(selectedIndex);
      } else {
        setActiveIndex(index => (index + direction + options.length) % options.length);
      }
    } else if (event.key === 'Home' && open) {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === 'End' && open) {
      event.preventDefault();
      setActiveIndex(options.length - 1);
    } else if ((event.key === 'Enter' || event.key === ' ') && open) {
      event.preventDefault();
      if (options[activeIndex]) chooseOption(options[activeIndex]);
    } else if (event.key === 'Escape' || event.key === 'Tab') {
      setOpen(false);
    }
  };

  return (
    <div className={`custom-select ${className}`} ref={rootRef}>
      <button
        type="button"
        className="custom-select-trigger"
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        aria-activedescendant={open ? `${id}-option-${activeIndex}` : undefined}
        onClick={() => open ? setOpen(false) : openMenu(selectedIndex)}
        onKeyDown={handleKeyDown}
      >
        <span className="custom-select-value">{selectedOption?.label ?? ''}</span>
        <ChevronDown size={15} aria-hidden="true" />
      </button>
      {open && position && createPortal(
        <div
          id={`${id}-listbox`}
          ref={menuRef}
          className="custom-select-menu"
          role="listbox"
          style={{
            left: position.left,
            top: position.top,
            width: position.width,
            maxHeight: position.maxHeight,
            ...position.theme
          }}
          onKeyDown={handleKeyDown}
        >
          {options.map((option, index) => (
            <button
              type="button"
              id={`${id}-option-${index}`}
              key={option.value}
              className={`custom-select-option${index === activeIndex ? ' active' : ''}${option.value === value ? ' selected' : ''}`}
              role="option"
              aria-selected={option.value === value}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => chooseOption(option)}
            >
              <span>{option.label}</span>
              {option.value === value && <Check size={14} aria-hidden="true" />}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
