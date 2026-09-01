import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
const getWorkerById = vi.hoisted(() => vi.fn());
vi.mock("@/features/workers/queries", () => ({ getWorkerById }));
vi.mock("@/features/workers/actions", () => ({ updateWorkerFromForm: vi.fn(), setWorkerActiveFromForm: vi.fn() }));
vi.mock("@/features/workers/components/worker-edit-form", () => ({ WorkerEditForm: () => null }));
vi.mock("next/navigation", () => ({ notFound: vi.fn() }));
import EditWorkerPage from "./page";
describe("EditWorkerPage", () => { it("renders the production expanded header", async () => { getWorkerById.mockResolvedValue({ id: "w1", displayName: "Ana López", workerKind: "MASTER", isActive: true }); render(await EditWorkerPage({ params: Promise.resolve({ id: "w1" }), searchParams: Promise.resolve({}) })); expect(screen.getByRole("heading", { level: 1, name: "Ana López" })).toBeInTheDocument(); expect(screen.getByText("Actualiza los datos del perfil operativo.")).toBeInTheDocument(); }); });
