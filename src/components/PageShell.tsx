import { ReactNode } from "react";

interface PageShellProps {
  children: ReactNode;
  className?: string;
  /** Tailwind background class for the inner app surface. Defaults to the standard page tone. */
  bg?: string;
}

/**
 * Wraps every screen. On phone widths it is edge-to-edge, exactly like today.
 * From tablet width up it centers the app as a framed column against a neutral
 * backdrop instead of stretching a phone layout across the full browser window.
 * The frame spans the full viewport height (not a floating card) so the fixed
 * BottomNav — which is also capped to this same max width — always lines up
 * with its bottom edge, on every breakpoint.
 */
export function PageShell({ children, className = "", bg = "bg-page" }: PageShellProps) {
  return (
    <div className="flex min-h-dvh justify-center bg-backdrop">
      <div
        dir="rtl"
        className={`relative flex w-full max-w-[480px] flex-col font-cairo ${bg} md:border-x md:border-black/[0.04] md:shadow-shell ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
