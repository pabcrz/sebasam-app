"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button, Input } from "@/components/ui";

const searchDebounceMs = 300;
const localChangeMarker = Symbol("local customer search change");

export function CustomerSearch() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryFromUrl = searchParams.get("q") ?? "";
  const [query, setQuery] = React.useState(queryFromUrl);
  const [isPending, startTransition] = React.useTransition();
  const latestQueryRef = React.useRef(queryFromUrl);
  const pendingQueryRef = React.useRef<string | typeof localChangeMarker | null>(null);
  const navigationIdRef = React.useRef(0);

  React.useEffect(() => {
    if (pendingQueryRef.current === queryFromUrl) {
      pendingQueryRef.current = null;
      latestQueryRef.current = queryFromUrl;
      setQuery(queryFromUrl);
      return;
    }

    // A previous URL response must not replace newer text still waiting to navigate.
    if (pendingQueryRef.current === null && queryFromUrl !== latestQueryRef.current) {
      latestQueryRef.current = queryFromUrl;
      setQuery(queryFromUrl);
    }
  }, [queryFromUrl]);

  const replaceSearch = React.useCallback((nextQuery: string) => {
    const navigationId = ++navigationIdRef.current;
    const params = new URLSearchParams(searchParams.toString());
    const normalizedQuery = nextQuery.trim();
    pendingQueryRef.current = normalizedQuery;

    if (normalizedQuery) params.set("q", normalizedQuery);
    else params.delete("q");

    const search = params.toString();
    const href = `${pathname}${search ? `?${search}` : ""}`;

    startTransition(() => {
      // Do not let an older debounce replace a newer URL state.
      if (navigationId === navigationIdRef.current) router.replace(href, { scroll: false });
    });
  }, [pathname, router, searchParams, startTransition]);

  React.useEffect(() => {
    if (query.trim() === queryFromUrl) return;

    const timeoutId = window.setTimeout(() => {
      if (query === latestQueryRef.current) replaceSearch(query);
    }, searchDebounceMs);

    return () => window.clearTimeout(timeoutId);
  }, [query, queryFromUrl, replaceSearch]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    pendingQueryRef.current = localChangeMarker;
    latestQueryRef.current = event.target.value;
    setQuery(event.target.value);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    replaceSearch(query);
  };

  const clearSearch = () => {
    pendingQueryRef.current = localChangeMarker;
    latestQueryRef.current = "";
    setQuery("");
    replaceSearch("");
  };

  return (
    <form className="flex flex-col gap-3 sm:flex-row" role="search" onSubmit={handleSubmit} aria-busy={isPending}>
      <Input
        aria-label="Buscar clientes"
        name="q"
        value={query}
        onChange={handleChange}
        placeholder="Buscar por nombre, teléfono, correo, dirección, placas o notas"
        className="flex-1"
      />
      <Button type="submit" variant="secondary" className="w-full sm:w-fit" disabled={isPending}>
        <Search className="h-4 w-4" aria-hidden="true" />
        Buscar
      </Button>
      {query ? (
        <Button type="button" variant="outline" className="w-full sm:w-fit" onClick={clearSearch} disabled={isPending}>
          <X className="h-4 w-4" aria-hidden="true" />
          Limpiar
        </Button>
      ) : null}
      <p className="sr-only" role="status">
        {isPending ? "Actualizando resultados..." : ""}
      </p>
    </form>
  );
}
