-- Quote.administrative no tenía reglas de negocio ni forma de activarse desde la interfaz.
-- Solo se guardaba y mostraba como etiqueta; se elimina la columna.
ALTER TABLE "Quote" DROP COLUMN "administrative";
