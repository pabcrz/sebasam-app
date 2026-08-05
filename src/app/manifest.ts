import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Operaciones SEBASAM",
    short_name: "SEBASAM",
    description: "Cotizaciones, órdenes de trabajo y registros de ejecución para las operaciones de SEBASAM.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f3f6fa",
    theme_color: "#004AAD",
    orientation: "portrait",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
