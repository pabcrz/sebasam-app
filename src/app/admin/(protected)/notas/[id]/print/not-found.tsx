import { NotFoundExperience } from "@/components/errors/not-found-experience";

export default function PrintNotFound() {
  return (
    <NotFoundExperience message="La nota que buscas no está disponible, consulta al taller" />
  );
}
