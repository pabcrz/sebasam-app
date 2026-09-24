import { ImageResponse } from "next/og";
import { getSharedQuoteByToken } from "@/features/quotes/domain";
import { formatVehicle, formatSnapshotVehicle, formatOperationalDate } from "@/features/quotes/lib/format";
import {
  resolveDocumentFolio,
  resolveDocumentPresentation,
} from "@/features/quotes/lib/document-resolver";
import { resolveCustomerDisplayIdentity } from "@/features/quotes/lib/quote-snapshots";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

interface OpengraphImageProps {
  params: Promise<{ token: string }>;
}

export default async function OpengraphImage({ params }: OpengraphImageProps) {
  const { token } = await params;

  try {
    const sharedQuote = await getSharedQuoteByToken(token);
    const quote = sharedQuote.quote;
    const { documentTitle } = resolveDocumentPresentation(quote);
    const displayFolio = resolveDocumentFolio(quote) || quote.number;
    const identity = resolveCustomerDisplayIdentity(quote);
    const customerName = identity.displayName;
    const vehicleDescription = quote.vehicle
      ? formatVehicle(quote.vehicle)
      : formatSnapshotVehicle(quote.vehicleSnapshot);
    const dateFormatted = quote.operationalDate
      ? formatOperationalDate(quote.operationalDate)
      : "Fecha pendiente";

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            backgroundColor: "#070F1E",
            backgroundImage:
              "radial-gradient(circle at 25px 25px, #0F1F38 2%, transparent 0%), radial-gradient(circle at 75px 75px, #0F1F38 2%, transparent 0%)",
            backgroundSize: "100px 100px",
            padding: "48px 56px",
            color: "#F8FAFC",
            fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          }}
        >
          {/* Header Bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "2px solid #1E293B",
              paddingBottom: "24px",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  fontSize: "36px",
                  fontWeight: 900,
                  letterSpacing: "2px",
                  color: "#FFFFFF",
                }}
              >
                SEBASAM
              </span>
              <span
                style={{
                  fontSize: "15px",
                  fontWeight: 600,
                  letterSpacing: "1px",
                  color: "#94A3B8",
                  marginTop: "2px",
                }}
              >
                SUSPENSIONES DE AIRE Y MUELLES
              </span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                borderRadius: "8px",
                backgroundColor: "rgba(14, 165, 233, 0.12)",
                border: "1px solid rgba(14, 165, 233, 0.3)",
              }}
            >
              <span
                style={{
                  fontSize: "20px",
                  fontWeight: 800,
                  letterSpacing: "1.5px",
                  color: "#38BDF8",
                }}
              >
                {documentTitle}
              </span>
            </div>
          </div>

          {/* Main Card Content */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              backgroundColor: "rgba(15, 23, 42, 0.8)",
              border: "1px solid #1E293B",
              borderRadius: "16px",
              padding: "32px 36px",
              gap: "20px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
            }}
          >
            {/* Customer and vehicle identity lead; folio remains secondary. */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
                <span
                  style={{
                    fontSize: "38px",
                    fontWeight: 900,
                    color: "#FFFFFF",
                    letterSpacing: "-0.5px",
                  }}
                >
                  {customerName}
                </span>
              </div>
              <span style={{ fontSize: "24px", color: "#CBD5E1", fontWeight: 600 }}>
                {vehicleDescription}{identity.operatorName ? ` · ${identity.operatorRole}: ${identity.operatorName}` : ""}
              </span>
              {quote.title ? (
                <span
                  style={{
                    fontSize: "22px",
                    color: "#94A3B8",
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {quote.title}
                </span>
              ) : null}
              <span style={{ fontSize: "16px", color: "#64748B", fontWeight: 600 }}>
                {documentTitle} · {displayFolio}
              </span>
            </div>

            <div
              style={{
                width: "100%",
                height: "1px",
                backgroundColor: "#334155",
              }}
            />

            {/* Info Grid */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "32px",
              }}
            >
              {/* Cliente */}
              <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    letterSpacing: "1px",
                    color: "#64748B",
                    marginBottom: "4px",
                  }}
                >
                  CLIENTE
                </span>
                <span
                  style={{
                    fontSize: "26px",
                    fontWeight: 700,
                    color: "#F1F5F9",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {customerName}
                </span>
              </div>

              {/* Vehículo */}
              <div style={{ display: "flex", flexDirection: "column", flex: 1.2 }}>
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    letterSpacing: "1px",
                    color: "#64748B",
                    marginBottom: "4px",
                  }}
                >
                  VEHÍCULO
                </span>
                <span
                  style={{
                    fontSize: "26px",
                    fontWeight: 700,
                    color: "#F1F5F9",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {vehicleDescription}
                </span>
              </div>

              {/* Fecha */}
              <div style={{ display: "flex", flexDirection: "column", flex: 0.8 }}>
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    letterSpacing: "1px",
                    color: "#64748B",
                    marginBottom: "4px",
                  }}
                >
                  FECHA
                </span>
                <span
                  style={{
                    fontSize: "22px",
                    fontWeight: 600,
                    color: "#CBD5E1",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {dateFormatted}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              color: "#64748B",
              fontSize: "16px",
              fontWeight: 500,
            }}
          >
            <span>Servicio y Refacciones para Suspensiones de Aire y Muelles</span>
            <span style={{ color: "#38BDF8", fontWeight: 600 }}>app.sebasam.online</span>
          </div>
        </div>
      ),
      {
        ...size,
      }
    );
  } catch {
    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#070F1E",
            padding: "48px 56px",
            color: "#F8FAFC",
            fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            textAlign: "center",
          }}
        >
          <span
            style={{
              fontSize: "48px",
              fontWeight: 900,
              letterSpacing: "2px",
              color: "#FFFFFF",
              marginBottom: "12px",
            }}
          >
            SEBASAM
          </span>
          <span
            style={{
              fontSize: "24px",
              fontWeight: 600,
              color: "#94A3B8",
              marginBottom: "24px",
            }}
          >
            SUSPENSIONES DE AIRE Y MUELLES
          </span>
          <span
            style={{
              fontSize: "20px",
              color: "#64748B",
            }}
          >
            Portal de Clientes y Cotizaciones
          </span>
        </div>
      ),
      {
        ...size,
      }
    );
  }
}
