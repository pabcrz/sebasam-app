"use client";

import * as React from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui";
import { QuoteBuilder } from "./quote-builder";

type CustomerOption = {
  id: string;
  name: string;
};

type QuoteBuilderDialogProps = {
  customers: CustomerOption[];
  createAction: (formData: FormData) => void | Promise<void>;
};

export function QuoteBuilderDialog({ customers, createAction }: QuoteBuilderDialogProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="primary">
          Nueva cotización
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Nueva cotización</DialogTitle>
          <DialogDescription>
            Completa el flujo para crear una cotización en borrador.
          </DialogDescription>
        </DialogHeader>
        <QuoteBuilder customers={customers} createAction={createAction} />
      </DialogContent>
    </Dialog>
  );
}
