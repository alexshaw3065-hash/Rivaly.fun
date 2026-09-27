import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

// The one button. Variants and sizes are fixed (docs/plans/design-system-rebuild.md §5):
//   primary  — Rivaly blue: the ONE main action on a screen
//   inverse  — white on black: secondary emphasis ("Continue", "Confirm")
//   secondary— surface + edge: everything else that's a real button
//   ghost    — text only until pressed
//   yes / no / money — the committed action for a side ("Throw down $10 on YES"), or a payout
//   danger   — destructive, quiet (red text, tint on press)
// Press feedback lives on pointer-down (scale .97, 100ms, Emil's curve).

export type ButtonVariant = "primary" | "inverse" | "secondary" | "ghost" | "yes" | "no" | "money" | "danger";
export type ButtonSize = "sm" | "md" | "lg" | "cta";

const BASE =
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-control transition-[transform,background-color,color,opacity] duration-100 ease-out active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-yes text-white hover:brightness-110",
  inverse: "bg-foreground text-background hover:opacity-90",
  secondary: "bg-surface-elevated text-foreground edge hover:bg-surface-3",
  ghost: "text-foreground hover:bg-overlay-1 active:bg-overlay-2",
  yes: "bg-yes text-white hover:brightness-110",
  no: "bg-no text-white hover:brightness-110",
  money: "bg-money text-white hover:brightness-110",
  danger: "text-no hover:bg-no-tint active:bg-no-tint",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-label",
  md: "h-10 px-4 text-label",
  lg: "h-12 px-5 text-body-lg font-semibold",
  cta: "h-14 w-full px-5 text-body-lg font-semibold",
};

export function buttonClasses({ variant = "secondary", size = "md", full = false, className = "" }: { variant?: ButtonVariant; size?: ButtonSize; full?: boolean; className?: string } = {}): string {
  return [BASE, VARIANTS[variant], SIZES[size], full ? "w-full" : "", className].filter(Boolean).join(" ");
}

function Spinner() {
  return <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent opacity-80" />;
}

type ButtonProps = Omit<ComponentProps<"button">, "children"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  full?: boolean;
  /** Shows progress and blocks repeat taps — set it the moment the tap lands. */
  pending?: boolean;
  leading?: ReactNode;
  children: ReactNode;
};

export function Button({ variant, size, full, pending = false, leading, className, disabled, children, type = "button", ...rest }: ButtonProps) {
  return (
    <button type={type} {...rest} disabled={disabled || pending} aria-busy={pending || undefined} className={buttonClasses({ variant, size, full, className })}>
      {pending ? <Spinner /> : leading}
      {children}
    </button>
  );
}

type ButtonLinkProps = Omit<ComponentProps<typeof Link>, "children"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  full?: boolean;
  leading?: ReactNode;
  children: ReactNode;
};

/** A link that looks and presses exactly like a Button. */
export function ButtonLink({ variant, size, full, leading, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link {...rest} className={buttonClasses({ variant, size, full, className: typeof className === "string" ? className : "" })}>
      {leading}
      {children}
    </Link>
  );
}
