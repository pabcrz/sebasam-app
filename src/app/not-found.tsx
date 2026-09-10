import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh w-full items-center justify-center px-4 py-12 md:px-6">
      <Card className="w-full md:max-w-100">
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
            Error 404
          </p>
          <CardTitle as="h1" className="mt-2 break-words text-3xl">
            Página no encontrada
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[var(--color-text-muted)]">
            La página que buscas no existe o fue movida.
          </p>
          <Button asChild className="w-full">
            <Link href="/">Volver al inicio</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
