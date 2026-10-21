import React, { useMemo, useState } from 'react';
import { Badge, ColumnSort, DataTable as FiberDataTable, MetricsCard as FiberMetrics, Tab, TabNavs, Tabs as FiberTabs, Typography } from '@miq/fiber-ui';
import type { DataTableColumnDef } from '@miq/fiber-ui';
import type { SortingState } from '@tanstack/react-table';
import { Info } from '@miq/fiber-ui/icons';
import { IconButton } from './core';
import { Popover } from './overlay';

export { AIPrompt } from '@miq/fiber-ui';
export type { AIPromptProps } from '@miq/fiber-ui';

export function Tabs<T extends string>({
  value,
  items,
  onChange,
}: {
  value: T;
  items: { value: T; label: React.ReactNode; count?: number; icon?: React.ReactNode }[];
  onChange: (value: T) => void;
}) {
  const index = Math.max(0, items.findIndex(item => item.value === value));
  return (
    <FiberTabs activeIndex={index} type="rounded" onChange={id => { const next = items[id]; if (next) onChange(next.value); }}>
      <TabNavs>
        {items.map((item, itemIndex) => (
          <Tab
            key={item.value}
            id={itemIndex}
            label={typeof item.label === 'string' ? item.label : String(item.value)}
            leftSlot={item.icon}
            rightSlot={item.count !== undefined ? <Badge compact variant="neutral" badgeStyle="outline">{item.count}</Badge> : undefined}
          />
        ))}
      </TabNavs>
    </FiberTabs>
  );
}

export function InfoPopover({ title, children, width = 400, align = 'start' }: { title: string; children: React.ReactNode; width?: number; align?: 'start' | 'end' | 'center' }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover
      open={open}
      onClose={() => setOpen(false)}
      align={align}
      width={width}
      anchor={
        <IconButton label={title} size="sm" active={open} onClick={event => { event.stopPropagation(); setOpen(current => !current); }}>
          <Info size={16} />
        </IconButton>
      }
    >
      {children}
    </Popover>
  );
}

const textOf = (node: React.ReactNode): string | undefined => {
  if (node == null || typeof node === 'boolean') return undefined;
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).filter(Boolean).join(' ');
  if (React.isValidElement(node)) return textOf((node.props as { children?: React.ReactNode }).children);
  return undefined;
};

export function MetricsCard({
  title,
  icon,
  value,
  suffix,
  footer,
  onClick,
  selected,
}: {
  title: React.ReactNode;
  icon?: React.ReactNode;
  info?: React.ReactNode;
  infoTitle?: string;
  value: React.ReactNode;
  suffix?: React.ReactNode;
  badge?: React.ReactNode;
  trailing?: React.ReactNode;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  onClick?: () => void;
  selected?: boolean;
}) {
  return (
    <FiberMetrics
      value={textOf(value) ?? ''}
      unit={textOf(suffix)}
      metricsName={textOf(title)}
      topIcon={icon}
      bottomContextLabel={textOf(footer)}
      metricsValueSize="lg"
      isSelected={selected}
      onClick={onClick}
    />
  );
}

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render: (row: T) => React.ReactNode;
  sortValue?: (row: T) => number | string;
  width?: number | string;
  align?: 'left' | 'right' | 'center';
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  selectedKey,
  mutedKeys,
  emptyText = 'No results match your filters.',
  defaultSort,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  selectedKey?: string | null;
  mutedKeys?: Set<string>;
  emptyText?: string;
  defaultSort?: { key: string; dir: 'asc' | 'desc' };
}) {
  const [sorting, setSorting] = useState<SortingState>(defaultSort ? [{ id: defaultSort.key, desc: defaultSort.dir === 'desc' }] : []);
  const sorted = useMemo(() => {
    const active = sorting[0];
    if (!active) return rows;
    const column = columns.find(item => item.key === active.id);
    if (!column?.sortValue) return rows;
    const get = column.sortValue;
    return [...rows].sort((a, b) => {
      const left = get(a);
      const right = get(b);
      const cmp = typeof left === 'number' && typeof right === 'number' ? left - right : String(left).localeCompare(String(right));
      return active.desc ? -cmp : cmp;
    });
  }, [rows, sorting, columns]);

  const defs = useMemo<DataTableColumnDef<T>[]>(
    () =>
      columns.map(column => ({
        id: column.key,
        accessorFn: (row: T) => column.sortValue?.(row) ?? '',
        enableSorting: !!column.sortValue,
        size: typeof column.width === 'number' ? column.width : 180,
        meta: { align: column.align },
        header: column.sortValue
          ? ({ column: tableColumn }) => <ColumnSort column={tableColumn} label={typeof column.header === 'string' ? column.header : column.key} />
          : () => column.header,
        cell: ({ row }) => {
          const key = rowKey(row.original);
          return (
            <div
              className={mutedKeys?.has(key) ? 'is-muted' : undefined}
              style={{ fontWeight: selectedKey === key ? 600 : undefined }}
              onClick={event => {
                if ((event.target as HTMLElement).closest('button, a')) return;
                onRowClick?.(row.original);
              }}
            >
              {column.render(row.original)}
            </div>
          );
        },
      })),
    [columns, mutedKeys, onRowClick, rowKey, selectedKey],
  );

  if (sorted.length === 0) {
    return (
      <Typography variant="Body" size="md" as="p" style={{ padding: 24, textAlign: 'center' }}>
        {emptyText}
      </Typography>
    );
  }

  const height = Math.min(720, sorted.length * 64 + 56);
  return (
    <FiberDataTable
      columns={defs}
      data={sorted}
      width="100%"
      height={height}
      isInteractive={!!onRowClick}
      sortingState={{ sorting, setSorting }}
    />
  );
}
