import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrintNotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--color-bg-soft)] px-4 py-8">
      <Card className="w-full max-w-[420px] text-center">
        <CardHeader>
          <CardTitle as="h1">Nota no disponible</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[var(--color-text-muted)]">
            La nota que buscas no está disponible, consulta al taller
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
