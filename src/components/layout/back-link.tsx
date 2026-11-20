"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

// Path the user was on before the current one, kept for the whole session in this tab.
let currentPath: string | null = null;
let previousPath: string | null = null;

/** Mount once in the app shell so back links know where the user really came from. */
export function useTrackPreviousPath() {
  const pathname = usePathname();
  React.useEffect(() => {
    if (pathname === currentPath) return;
    previousPath = currentPath;
    currentPath = pathname;
  }, [pathname]);
}

type BackLinkProps = Omit<React.ComponentProps<typeof Link>, "href"> & { href: string };

/**
 * A "back" link. When the previous screen is the one it points to, it steps back in history
 * (so the Android back button and this link agree); otherwise it is a normal link.
 */
export function BackLink({ href, onClick, ...props }: BackLinkProps) {
  const router = useRouter();
  const target = href.split(/[?#]/)[0];

  return (
    <Link
      href={href}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
        if (previousPath === target) {
          event.preventDefault();
          router.back();
        }
      }}
      {...props}
    />
  );
}
