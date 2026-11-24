import { Button, Input, Label } from "@/components/ui";
import { EXPENSE_CATEGORIES } from "../expenses/categories";

type CategorySharesFormProps = {
  shares: Record<string, number>;
  action: (formData: FormData) => void | Promise<void>;
  notice?: { tone: "success" | "danger"; text: string } | null;
};

/** One percentage per expense category: what a new expense charges to refacciones y materiales (the rest goes to mano de obra). */
export function CategorySharesForm({ shares, action, notice }: CategorySharesFormProps) {
  return (
    <form action={action} className="grid gap-4" data-testid="category-shares-form">
      <p className="text-sm text-[var(--color-text-muted)]">
        Qué parte de cada gasto se carga a refacciones y materiales cuando se registra; el resto va a mano de obra. Solo aplica a gastos nuevos: los que ya registraste conservan su reparto, que puedes ajustar en Balance → Utilidad → Asignar.
      </p>
      {notice ? (
        <p role={notice.tone === "danger" ? "alert" : "status"} className="rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-surface)] px-4 py-3 text-sm">{notice.text}</p>
      ) : null}
      <ul className="divide-y divide-[var(--color-border-light)] overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
        {EXPENSE_CATEGORIES.map((category) => (
          <li key={category.value} data-testid="category-share-row" className="flex items-center justify-between gap-3 p-3">
            <Label htmlFor={`share-${category.value}`} className="min-w-0">{category.label}</Label>
            <span className="flex items-center gap-2">
              <Input id={`share-${category.value}`} name={`share-${category.value}`} type="number" inputMode="numeric" min={0} max={100} step={1} required defaultValue={shares[category.value] ?? category.defaultPartsSharePercent} className="w-24 text-right" />
              <span aria-hidden="true" className="text-sm text-[var(--color-text-muted)]">%</span>
            </span>
          </li>
        ))}
      </ul>
      <Button type="submit" variant="primary" size="lg">Guardar porcentajes</Button>
    </form>
  );
}
