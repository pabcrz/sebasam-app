"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { CustomerEditDialog, type CustomerEditData } from "./customer-edit-dialog";
import { updateCustomerAction } from "../actions";

export interface CustomerEditButtonProps {
  customer: CustomerEditData;
}

export function CustomerEditButton({ customer }: CustomerEditButtonProps) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Editar
      </Button>
      <CustomerEditDialog
        open={open}
        onOpenChange={setOpen}
        customer={customer}
        onSave={async (data) => {
          const res = await updateCustomerAction(data);
          if (res.success) {
            router.refresh();
          }
          return res;
        }}
      />
    </>
  );
}
