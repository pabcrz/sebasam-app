import { NotFoundExperience } from "@/components/errors/not-found-experience";

export default function NotFound() {
  return (
    <NotFoundExperience message="No encontramos lo que buscas. Puede que se haya movido o ya no exista." />
  );
}
