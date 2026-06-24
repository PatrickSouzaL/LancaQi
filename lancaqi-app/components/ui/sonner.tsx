"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

/**
 * Toaster global (feedback de mutação padronizado — UI_UX_Guidelines).
 *
 * O app é forçado em tema claro (ver root layout), então não dependemos de
 * `next-themes`. As cores seguem os tokens do design system via CSS vars.
 */
export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      position="top-right"
      richColors
      closeButton
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
}
