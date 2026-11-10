'use client';

import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon } from 'lucide-react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

// Sonner's own gaps from the screen's edge, to which the room for the phone's nav bar is added.
const GAP = '24px';
const NARROW_SCREEN_GAP = '16px';
const aboveNavBar = (gap: string) => ({ bottom: `calc(${gap} + var(--phone-nav-clearance))` });

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      // Sonner switches to its narrow layout at 600px and the nav bar shows up to 767px, so both
      // offsets leave room for the bar. The clearance is zero once the nav is in the header.
      offset={aboveNavBar(GAP)}
      mobileOffset={aboveNavBar(NARROW_SCREEN_GAP)}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
