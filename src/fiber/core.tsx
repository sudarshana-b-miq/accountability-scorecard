import React from 'react';
import {
  Badge as FiberBadge,
  ButtonV2 as FiberButton,
  Callout as FiberCallout,
  Card as FiberCard,
  Pill as FiberPill,
  ProgressBar as FiberProgress,
  Stepper as FiberStepper,
  Tooltip as FiberTooltip,
  Typography as FiberTypography,
} from '@miq/fiber-ui';
import { Chip as FiberChip } from '@miq/fiber-ui';
import { CheckCircle, XCircle } from '@miq/fiber-ui/icons';

export type Tone = 'success' | 'warning' | 'error' | 'info' | 'brand' | 'neutral' | 'data4';

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');
export { cx };

type BadgeVariant = 'primary' | 'secondary' | 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'light';

const badgeVariant = (tone: Tone): BadgeVariant => {
  if (tone === 'error') return 'danger';
  if (tone === 'data4') return 'warning';
  if (tone === 'brand') return 'primary';
  return tone;
};

const calloutVariant = (tone: Tone): 'info' | 'error' | 'warn' | 'success' => {
  if (tone === 'error') return 'error';
  if (tone === 'warning') return 'warn';
  if (tone === 'success') return 'success';
  return 'info';
};

const progressVariant = (tone: Tone): 'success' | 'info' | 'warning' | 'danger' | 'paused' => {
  if (tone === 'success') return 'success';
  if (tone === 'warning') return 'warning';
  if (tone === 'error') return 'danger';
  if (tone === 'data4') return 'warning';
  if (tone === 'neutral') return 'paused';
  return 'info';
};

export function Typography({
  variant = 'Body',
  size = 'md',
  as,
  fontWeight,
  className,
  style,
  children,
}: {
  variant?: 'Headline' | 'Body';
  size?: 'lg' | 'md' | 'sm';
  as?: React.ElementType;
  fontWeight?: 'regular' | 'medium' | 'semibold' | 'bold';
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <FiberTypography className={className} style={style} as={as} variant={variant} size={size} fontWeight={fontWeight ?? 'regular'}>
      {children}
    </FiberTypography>
  );
}

type AppButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger' | 'dangerSecondary';

const buttonLook = (variant: AppButtonVariant): { variant: 'primary' | 'secondary' | 'destructive'; appearance: 'fill' | 'outline' | 'none' } => {
  if (variant === 'secondary') return { variant: 'secondary', appearance: 'outline' };
  if (variant === 'tertiary') return { variant: 'secondary', appearance: 'none' };
  if (variant === 'danger') return { variant: 'destructive', appearance: 'fill' };
  if (variant === 'dangerSecondary') return { variant: 'destructive', appearance: 'outline' };
  return { variant: 'primary', appearance: 'fill' };
};

export interface ButtonV2Props extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  variant?: AppButtonVariant;
  size?: 'sm' | 'md';
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  loading?: boolean;
  inverse?: boolean;
  onClick?: React.MouseEventHandler<HTMLElement>;
}

export function ButtonV2({ variant = 'primary', size = 'md', startIcon, endIcon, loading, inverse, children, disabled, type = 'button', onClick, ...rest }: ButtonV2Props) {
  const look = buttonLook(variant);
  const status = loading
    ? { status: 'loading' as const, successIcon: <CheckCircle size={16} weight="fill" />, failIcon: <XCircle size={16} weight="fill" /> }
    : {};
  return (
    <FiberButton
      type={type}
      variant={look.variant}
      appearance={look.appearance}
      isCompact={size === 'sm'}
      isInverse={inverse}
      iconLeft={startIcon}
      iconRight={endIcon}
      disabled={disabled || loading}
      onClick={onClick}
      {...status}
      {...rest}
    >
      {children}
    </FiberButton>
  );
}

export function Tooltip({
  content,
  placement = 'top',
  children,
}: {
  content: React.ReactNode;
  placement?: 'top' | 'bottom';
  children: React.ReactNode;
}) {
  return (
    <FiberTooltip content={content} position={placement} tooltipType="simple">
      {children}
    </FiberTooltip>
  );
}

export interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  label: string;
  size?: 'sm' | 'md';
  active?: boolean;
  outlined?: boolean;
  tone?: 'error';
  counter?: number;
  inverse?: boolean;
  tooltipPlacement?: 'top' | 'bottom';
  onClick?: React.MouseEventHandler<HTMLElement>;
}

export function IconButton({ label, size = 'md', active, outlined, tone, counter, inverse, tooltipPlacement, children, type = 'button', ...rest }: IconButtonProps) {
  return (
    <Tooltip content={label} placement={tooltipPlacement}>
      <span className="fiber-iconbtn">
        <FiberButton
          type={type}
          aria-label={label}
          aria-pressed={active}
          variant={tone === 'error' ? 'destructive' : 'secondary'}
          appearance={outlined || active ? 'outline' : 'none'}
          isCompact={size === 'sm'}
          isInverse={inverse}
          iconLeft={children}
          {...rest}
        />
        {!!counter && (
          <span className="fiber-iconbtn__count">
            <FiberBadge compact variant="danger" badgeStyle="filled">
              {counter}
            </FiberBadge>
          </span>
        )}
      </span>
    </Tooltip>
  );
}

export function Badge({ tone = 'neutral', size = 'md', children, title }: { tone?: Tone; size?: 'md' | 'lg'; children: React.ReactNode; title?: string }) {
  return (
    <FiberBadge variant={badgeVariant(tone)} badgeStyle="filled" compact={size !== 'lg'} title={title}>
      {children}
    </FiberBadge>
  );
}

export function Pill({ tone = 'neutral', icon, outlined, children }: { tone?: Tone; icon?: React.ReactNode; outlined?: boolean; children: React.ReactNode }) {
  return (
    <FiberPill variant={badgeVariant(tone)} pillStyle={outlined ? 'outline' : 'filled'} showIcon={!!icon} customIcon={icon as React.ReactElement} position="left">
      {children}
    </FiberPill>
  );
}

const chipVariant = (tone?: Tone): 'danger' | 'warning' | 'info' | 'success' | undefined => {
  if (tone === 'error') return 'danger';
  if (tone === 'data4' || tone === 'warning') return 'warning';
  if (tone === 'info' || tone === 'success') return tone;
  return undefined;
};

export function Chip({
  selected,
  onClick,
  dotTone,
  icon,
  children,
}: {
  selected?: boolean;
  onClick?: () => void;
  dotTone?: Tone;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  const text = typeof children === 'string' || typeof children === 'number' ? String(children) : '';
  return (
    <FiberChip text={text} small isSelected={selected} onClick={onClick} variant={chipVariant(dotTone)} showIcon={!!dotTone} rightIcon={icon} aria-pressed={selected}>
      {null}
    </FiberChip>
  );
}

export function Callout({ tone = 'info', title, children }: { tone?: Tone; icon?: React.ReactNode; title?: React.ReactNode; children: React.ReactNode }) {
  return (
    <FiberCallout variant={calloutVariant(tone)} width="100%" withBorder isDescriptive={!!title}>
      {title ? <FiberCallout.Title>{title}</FiberCallout.Title> : null}
      <FiberCallout.Description>{children}</FiberCallout.Description>
    </FiberCallout>
  );
}

export function Card({
  padded = true,
  interactive,
  selected,
  onClick,
  className,
  style,
  children,
}: {
  padded?: boolean;
  interactive?: boolean;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <FiberCard className={className} style={style} isInteractive={interactive || !!onClick} isSelected={selected} onClick={onClick}>
      <FiberCard.Body style={padded ? undefined : { padding: 0 }}>{children}</FiberCard.Body>
    </FiberCard>
  );
}

export function ProgressBar({ value, tone = 'brand' }: { value: number; tone?: Tone }) {
  return <FiberProgress variant={progressVariant(tone)} percent={Math.max(0, Math.min(100, value))} simpleProgressBar />;
}

const GAUGE_COLOR: Record<string, { arc: string; label: string }> = {
  A: { arc: '#1e8158', label: '#115639' },
  B: { arc: '#62c47a', label: '#1f7a45' },
  C: { arc: '#f8c500', label: '#8d6f00' },
  D: { arc: '#ef8736', label: '#c45c00' },
  E: { arc: '#da294b', label: '#ad102c' },
};

function gaugePoint(cx: number, cy: number, radius: number, t: number): [number, number] {
  const angle = Math.PI * (1 - t);
  return [cx + radius * Math.cos(angle), cy - radius * Math.sin(angle)];
}

function gaugeArc(cx: number, cy: number, radius: number, from: number, to: number) {
  const [x1, y1] = gaugePoint(cx, cy, radius, from);
  const [x2, y2] = gaugePoint(cx, cy, radius, Math.min(1, Math.max(from + 0.001, to)));
  // The gauge is only a semicircle, so the arc is never the long way around the circle.
  // Sweep 1 runs from the left end up over the top.
  return `M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`;
}

export function ScoreRing({ value, size = 196, label }: { value: number; size?: number; tone?: Tone; label?: string }) {
  const score = Math.max(0, Math.min(100, Math.round(value)));
  const letter = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'E';
  const gauge = GAUGE_COLOR[letter];
  const stroke = Math.max(18, Math.round(size * 0.16));
  const inset = stroke / 2 + 2;
  const radius = (size - inset * 2) / 2;
  const cx = size / 2;
  const cy = inset + radius;
  const height = Math.round(cy + stroke / 2 + 2);
  const gradeSize = Math.round(size * 0.26);
  const scoreSize = Math.round(size * 0.13);
  return (
    <div className="score-ring" style={{ width: size, height }}>
      <svg width={size} height={height} viewBox={`0 0 ${size} ${height}`} role="img" aria-label={label ?? `Grade ${letter}, score ${score}`}>
        <path d={gaugeArc(cx, cy, radius, 0, 1)} fill="none" stroke="#ebe6f0" strokeWidth={stroke} strokeLinecap="round" />
        {score > 0 && <path d={gaugeArc(cx, cy, radius, 0, score / 100)} fill="none" stroke={gauge.arc} strokeWidth={stroke} strokeLinecap="round" />}
        <text x={cx - scoreSize * 0.85} y={cy - radius * 0.22} textAnchor="middle" dominantBaseline="middle" fontFamily="DM Sans, sans-serif" fontSize={gradeSize} fontWeight={700} fill={gauge.label}>
          {letter}
        </text>
        <text x={cx + gradeSize * 0.42} y={cy - radius * 0.22} textAnchor="middle" dominantBaseline="middle" fontFamily="DM Sans, sans-serif" fontSize={scoreSize} fontWeight={600} fill="#5c5c6b">
          {score}
        </text>
      </svg>
    </div>
  );
}

export function Stepper({ total, current, completed }: { total: number; current: number; completed?: boolean }) {
  return (
    <FiberStepper activeIndex={completed ? total : current} variant="horizontal" aria-label={`Step ${current + 1} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <FiberStepper.Step key={i}>{i + 1}</FiberStepper.Step>
      ))}
    </FiberStepper>
  );
}
