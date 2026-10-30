import { NotFoundExperience } from "@/components/errors/not-found-experience";

export default function CotizacionNotFound() {
  return (
    <NotFoundExperience message="La cotización que buscas no está disponible, consulta al taller" />
  );
}
