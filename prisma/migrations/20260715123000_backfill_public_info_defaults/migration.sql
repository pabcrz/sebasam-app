-- Populate the existing singleton row without overwriting configured values.
UPDATE "PaymentSettings"
SET
  "services" = CASE
    WHEN COALESCE(array_length("services", 1), 0) = 0
    THEN ARRAY['Alineación de ejes', 'Brio a muelles', 'Refuerzos', 'Soldadura']::TEXT[]
    ELSE "services"
  END,
  "products" = CASE
    WHEN COALESCE(array_length("products", 1), 0) = 0
    THEN ARRAY['Abrazaderas', 'Bujes', 'Perchas', 'Columpios', 'Tensores', 'Balancines']::TEXT[]
    ELSE "products"
  END
WHERE "id" = 1;
