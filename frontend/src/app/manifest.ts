import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OnProduction ERP",
    short_name: "OnProduction",
    description: "Sistema transaccional y logístico para el control del ciclo de vida de eventos e inventario físico serializado.",
    start_url: "/",
    display: "standalone",
    background_color: "#060913",
    theme_color: "#060913",
    orientation: "portrait-primary",
    scope: "/",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
