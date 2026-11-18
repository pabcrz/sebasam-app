"use client";

import * as React from "react";
import type { CustomerOption, QuoteBuilderProps } from "./quote-builder-contracts";

const customerSearchDelay = 500;
const minimumCustomerQueryLength = 2;

type CustomerSearchOptions = {
  customers: CustomerOption[];
  initialSelectedCustomer?: CustomerOption;
  customerId: string;
  searchCustomersAction: QuoteBuilderProps["searchCustomersAction"];
  onResults: (results: CustomerOption[]) => void;
};

function filterCustomers(customers: CustomerOption[], query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase("es-MX");
  if (!normalizedQuery) return customers;
  return customers.filter((customer) => customer.name.toLocaleLowerCase("es-MX").includes(normalizedQuery));
}

export function useQuoteCustomerSearch({
  customers,
  initialSelectedCustomer,
  customerId,
  searchCustomersAction,
  onResults,
}: CustomerSearchOptions) {
  const [customerOptions, setCustomerOptions] = React.useState<CustomerOption[]>(customers);
  const [customerSearch, setCustomerSearch] = React.useState(initialSelectedCustomer?.name ?? "");
  const [customerSearchError, setCustomerSearchError] = React.useState<string | null>(null);
  const [isSearchingCustomers, setIsSearchingCustomers] = React.useState(false);
  const customerSearchRequest = React.useRef(0);
  const selectedCustomerRef = React.useRef<CustomerOption | undefined>(initialSelectedCustomer);
  const knownCustomersRef = React.useRef(new Map(customers.map((customer) => [customer.id, customer])));
  const customerQueryCache = React.useRef(new Map<string, CustomerOption[]>());
  const selectedCustomerName = customerOptions.find((customer) => customer.id === customerId)?.name;

  React.useEffect(() => {
    const query = customerSearch.trim().toLocaleLowerCase("es-MX");
    if (!searchCustomersAction || customerSearch === selectedCustomerName || query.length < minimumCustomerQueryLength) {
      return;
    }
    if (customerQueryCache.current.has(query)) return;

    const requestId = ++customerSearchRequest.current;
    const timeout = window.setTimeout(async () => {
      setIsSearchingCustomers(true);
      setCustomerSearchError(null);
      try {
        const results = await searchCustomersAction({ query: customerSearch });
        if (requestId === customerSearchRequest.current) {
          results.forEach((customer) => knownCustomersRef.current.set(customer.id, customer));
          customerQueryCache.current.set(query, results);
          const selected = selectedCustomerRef.current;
          setCustomerOptions(
            selected && !results.some((customer) => customer.id === selected.id)
              ? [selected, ...results]
              : results,
          );
          onResults(results);
        }
      } catch {
        if (requestId === customerSearchRequest.current) {
          setCustomerSearchError("No se pudo buscar clientes. Intenta de nuevo.");
        }
      } finally {
        if (requestId === customerSearchRequest.current) setIsSearchingCustomers(false);
      }
    }, customerSearchDelay);
    return () => window.clearTimeout(timeout);
  }, [customerSearch, searchCustomersAction, selectedCustomerName, onResults]);

  function updateCustomerSearch(nextSearch: string) {
    // Invalidate immediately, before the next effect or debounce can run.
    customerSearchRequest.current += 1;
    setCustomerSearch(nextSearch);
    selectedCustomerRef.current = undefined;
    setCustomerSearchError(null);
    setIsSearchingCustomers(false);
    const cached = customerQueryCache.current.get(nextSearch.trim().toLocaleLowerCase("es-MX"));
    const nextOptions = cached ?? filterCustomers([...knownCustomersRef.current.values()], nextSearch);
    setCustomerOptions(nextOptions);
    return nextOptions;
  }

  function selectSearchCustomer(customer: CustomerOption) {
    customerSearchRequest.current += 1;
    selectedCustomerRef.current = customer;
    knownCustomersRef.current.set(customer.id, customer);
    setCustomerOptions((current) =>
      current.some((option) => option.id === customer.id) ? current : [customer, ...current],
    );
    setCustomerSearch(customer.name);
    setCustomerSearchError(null);
    setIsSearchingCustomers(false);
  }

  function clearCustomerSearchCache() {
    customerQueryCache.current.clear();
  }

  return {
    customerOptions,
    customerSearch,
    customerSearchError,
    isSearchingCustomers,
    updateCustomerSearch,
    selectSearchCustomer,
    clearCustomerSearchCache,
  };
}
