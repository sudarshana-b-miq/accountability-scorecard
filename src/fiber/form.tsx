import React, { useId } from 'react';
import { Button, ButtonGroup, Checkbox as FiberCheckbox, Dropdown as FiberDropdown, Input as FiberInput, RadioButton, Typography } from '@miq/fiber-ui';
import { WarningCircle } from '@miq/fiber-ui/icons';
import { cx } from './core';

export function Field({
  label,
  required,
  helper,
  error,
  counter,
  children,
}: {
  label?: React.ReactNode;
  required?: boolean;
  helper?: React.ReactNode;
  error?: React.ReactNode;
  counter?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="f-field">
      {label && (
        <Typography variant="Body" size="sm" fontWeight="medium" as="label">
          {label}
          {required && <span className="f-field__req">*</span>}
        </Typography>
      )}
      {children}
      {(helper || error || counter) && (
        <div className={cx('f-field__helper', !!error && 'is-error')}>
          <span>
            {error && <WarningCircle size={14} weight="fill" />}
            {error || helper}
          </span>
          {counter && <span>{counter}</span>}
        </div>
      )}
    </div>
  );
}

export function Input({
  icon,
  error,
  width,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { icon?: React.ReactNode; error?: boolean; width?: number | string }) {
  return <FiberInput width={width} icon={icon} error={error} {...rest} />;
}

export function Textarea({ error, rows = 3, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }) {
  const height = typeof rows === 'number' ? rows * 24 : 72;
  return <FiberInput textarea error={error} height={height} width="100%" {...rest} />;
}

export interface DropdownOption<T extends string = string> {
  value: T;
  label: string;
  description?: string;
}

export function Dropdown<T extends string>({
  value,
  options,
  onChange,
  label,
  placeholder = 'Select…',
  width,
  error,
  disabled,
}: {
  value: T | '';
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
  label?: string;
  icon?: React.ReactNode;
  placeholder?: string;
  width?: number | string;
  error?: boolean;
  disabled?: boolean;
}) {
  const id = useId();
  const fiberOptions = options.map(option => ({
    text: option.label,
    value: option.value,
    customOption: option.description ? (
      <span>
        {option.label}
        <span className="f-menu__desc">{option.description}</span>
      </span>
    ) : undefined,
  }));
  const selected = fiberOptions.find(option => option.value === value);
  return (
    <FiberDropdown
      id={id}
      options={fiberOptions}
      value={selected?.value}
      placeholder={selected?.text ?? placeholder}
      showPlaceholder
      label={label}
      width={width}
      disabled={disabled}
      error={error ? ' ' : undefined}
      showOnTop
      onChange={(selectedItem: { value: string | number } | Array<{ value: string | number }>) => {
        const item = Array.isArray(selectedItem) ? selectedItem[0] : selectedItem;
        if (item) onChange(String(item.value) as T);
      }}
    />
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
  description,
  card,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: React.ReactNode;
  description?: React.ReactNode;
  card?: boolean;
}) {
  const id = useId();
  const control = (
    <FiberCheckbox id={id} checked={checked} onChange={() => onChange(!checked)}>
      <span>
        {label}
        {description && <span className="f-check__desc">{description}</span>}
      </span>
    </FiberCheckbox>
  );
  if (!card) return control;
  return <div className={cx('f-option-card', checked && 'is-checked')}>{control}</div>;
}

export function Radio({
  checked,
  onChange,
  label,
  description,
  card,
}: {
  checked: boolean;
  onChange: () => void;
  label: React.ReactNode;
  description?: React.ReactNode;
  card?: boolean;
}) {
  const id = useId();
  const control = (
    <RadioButton id={id} name={id} checked={checked} onChange={onChange}>
      <span>
        {label}
        {description && <span className="f-check__desc">{description}</span>}
      </span>
    </RadioButton>
  );
  if (!card) return control;
  return <div className={cx('f-option-card', checked && 'is-checked')}>{control}</div>;
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: React.ReactNode; count?: number }[];
  onChange: (value: T) => void;
}) {
  const index = Math.max(0, options.findIndex(option => option.value === value));
  return (
    <ButtonGroup
      activeIndex={index}
      onClick={((_event: React.MouseEvent, next?: number) => {
        if (typeof next === 'number') onChange(options[next].value);
      }) as never}
    >
      {options.map(option => (
        <Button key={option.value} small>
          {option.label}
          {option.count !== undefined ? ` ${option.count}` : ''}
        </Button>
      ))}
    </ButtonGroup>
  );
}
