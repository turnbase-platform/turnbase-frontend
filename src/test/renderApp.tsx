// Test-only helper, never part of a Fast Refresh boundary.
/* eslint-disable react-refresh/only-export-components */
import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { App } from "../app/App";

function Where() {
  const { pathname, search } = useLocation();
  return <output data-testid="where">{pathname + search}</output>;
}

/** Renders the whole shell at `path` — pages need `AuthProvider`/`LinkProvider`/toast context. */
export function renderAt(path: string) {
  const Router = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[path]} useTransitions={false}>
      {children}
      <Where />
    </MemoryRouter>
  );
  render(<App Router={Router} />);
}

export const where = () => screen.getByTestId("where").textContent;
