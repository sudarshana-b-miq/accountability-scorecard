import React, { useEffect, useRef } from 'react';
import { Modal as FiberModal, Popover as FiberPopover, SidePanel as FiberSidePanel } from '@miq/fiber-ui';

function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return undefined;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  icon,
  size = 'medium',
  footer,
  footerStart,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
  footer?: React.ReactNode;
  footerStart?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <FiberModal isOpen={open} onClose={onClose} size={size} shouldCloseOnOverlayClick appElement={document.getElementById('root')}>
      <FiberModal.Header>
        {icon} {title}
      </FiberModal.Header>
      <FiberModal.Body>
        {subtitle && <div className="f-modal__subtitle">{subtitle}</div>}
        {children}
      </FiberModal.Body>
      {(footer || footerStart) && (
        <FiberModal.Footer>
          <div className="f-modal__foot">
            <div>{footerStart}</div>
            <FiberModal.ActionButtons>{footer}</FiberModal.ActionButtons>
          </div>
        </FiberModal.Footer>
      )}
    </FiberModal>
  );
}

const panelSize = (width: number): 'small' | 'medium' | 'large' => {
  if (width <= 400) return 'small';
  if (width >= 800) return 'large';
  return 'medium';
};

export function SidePanel({
  open,
  onClose,
  title,
  subtitle,
  headerExtra,
  width = 600,
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  headerExtra?: React.ReactNode;
  width?: 400 | 600 | 800;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <FiberSidePanel isOpen={open} onClose={onClose} size={panelSize(width)} align="right" top="64px">
      <FiberSidePanel.Header sticky>
        <div className="row-gap">
          <FiberSidePanel.Header.Title>{title}</FiberSidePanel.Header.Title>
          {headerExtra}
        </div>
        {subtitle && <FiberSidePanel.Header.Description>{subtitle}</FiberSidePanel.Header.Description>}
      </FiberSidePanel.Header>
      <FiberSidePanel.Body>
        <div style={{ padding: 16 }}>{children}</div>
      </FiberSidePanel.Body>
      {footer && (
        <FiberSidePanel.Footer>
          <div className="f-sidepanel__foot">{footer}</div>
        </FiberSidePanel.Footer>
      )}
    </FiberSidePanel>
  );
}

export function useClickOutside(ref: React.RefObject<HTMLElement>, open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return undefined;
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, open, onClose]);
}

export function Popover({
  open,
  onClose,
  anchor,
  align = 'start',
  width = 360,
  children,
}: {
  open: boolean;
  onClose: () => void;
  anchor: React.ReactNode;
  align?: 'start' | 'end' | 'center';
  width?: number;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useEscape(open, onClose);
  const placement = align === 'end' ? 'bottom end' : align === 'center' ? 'bottom' : 'bottom start';
  return (
    <span className="f-popover-anchor" ref={ref} onClick={event => event.stopPropagation()}>
      {anchor}
      <FiberPopover triggerRef={ref} isOpen={open} onOpenChange={isOpen => { if (!isOpen) onClose(); }} placement={placement} width={width}>
        {children}
      </FiberPopover>
    </span>
  );
}
