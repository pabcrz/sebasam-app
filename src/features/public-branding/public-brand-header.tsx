"use client";

import Image from "next/image";
import type { PublicBusinessIdentity } from "./domain";

export function PublicBrandHeader({ identity }: { identity: PublicBusinessIdentity }) {
  return (
    <div className="flex items-start gap-3">
      <Image
        src={identity.logoSrc ?? "/logo-white-short.png"}
        alt={`Logo de ${identity.name ?? "negocio"}`}
        width={52}
        height={52}
        className="rounded-[var(--radius-md)] bg-white/10 p-1 shadow-md"
        priority
      />
      <div className="min-w-0">
        {identity.name ? (
          <h1 className="font-mono text-3xl font-extrabold leading-none tracking-[-0.05em] md:text-4xl">
            {identity.name}
          </h1>
        ) : null}
        {identity.fullName ? (
          <p className="mt-2 max-w-2xl text-sm text-[var(--color-on-navy-tint)] opacity-90 md:text-base">
            {identity.fullName}
          </p>
        ) : null}
      </div>
    </div>
  );
}
