"use client";

import { ApiError } from "@ecommerce/api-client";
import Link from "next/link";
import type { ReactNode } from "react";

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.kind === "forbidden") return "You do not have permission to do this.";
    if (error.kind === "network") return "Cannot reach the server. Check your connection and retry.";
    if (error.problem?.errors) return Object.values(error.problem.errors).flat().join(" ");
  }
  return error instanceof Error ? error.message : "Something went wrong.";
}

export function ErrorNotice({ error }: { error: unknown }) {
  const expired = error instanceof ApiError && error.kind === "unauthorized";
  return (
    <p role="alert" className="error-box">
      {expired ? "Your session has expired. " : null}
      {expired ? <Link href="/login?reason=expired">Sign in again</Link> : errorMessage(error)}
    </p>
  );
}

interface QueryLike<T> {
  data: T | undefined;
  error: unknown;
  isPending: boolean;
  refetch: () => unknown;
}

export function QueryState<T>({ query, isEmpty, empty = "Nothing to show yet.", children }: {
  query: QueryLike<T>;
  isEmpty?: (data: T) => boolean;
  empty?: string;
  children: (data: T) => ReactNode;
}) {
  if (query.isPending) return <p aria-busy="true" className="muted">Loading…</p>;
  if (query.error || query.data === undefined) {
    return (
      <div>
        <ErrorNotice error={query.error} />
        <button type="button" className="ui-button secondary" onClick={() => void query.refetch()}>Retry</button>
      </div>
    );
  }
  if (isEmpty?.(query.data)) return <p className="muted">{empty}</p>;
  return <>{children(query.data)}</>;
}
