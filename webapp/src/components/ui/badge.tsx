import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 shadow-soft-xs",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-slate-900 text-slate-50 hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200",
        // M-PESA Green is STRICTLY for success states only (e.g. Paid, Confirmed, Verified)
        success:
          "border-transparent bg-[var(--color-mpesa-green)] text-white shadow-soft-sm font-bold",
        successSubtle:
          "border-[var(--color-mpesa-green-subtle-border)] bg-[var(--color-mpesa-green-subtle)] text-[var(--color-mpesa-green-active)] font-bold",
        // Yellow highlight token
        highlight:
          "border-amber-300 bg-[var(--color-highlight-yellow)] text-slate-950 font-bold shadow-soft-xs",
        secondary:
          "border-slate-200 bg-slate-100 text-slate-800 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100",
        destructive:
          "border-transparent bg-red-600 text-white shadow-soft-xs hover:bg-red-700",
        outline:
          "border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-300",
        dashboard:
          "border-slate-700 bg-slate-900 text-slate-200 font-mono shadow-soft-xs",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
