"use client";

import { useEffect, useState } from "react";

type BillingStatus = {
  isPro: boolean;
  plan: "free" | "starter_monthly" | "pro_monthly" | "pro_annual";
  status: "free" | "trialing" | "active" | "past_due" | "canceled" | "incomplete";
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

function getSessionId() {
  if (typeof window === "undefined") return "server-session";

  const existing = localStorage.getItem("nutrimerca_session_id");
  if (existing) return existing;

  const created = `nm_${crypto.randomUUID()}`;
  localStorage.setItem("nutrimerca_session_id", created);
  return created;
}

function formatPlan(plan: BillingStatus["plan"]) {
  if (plan === "starter_monthly") return "Starter mensual";
  if (plan === "pro_monthly") return "Pro mensual";
  if (plan === "pro_annual") return "Pro anual";
  return "Free";
}

export default function CuentaPage() {
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadBillingStatus() {
      try {
        const sessionId = getSessionId();
        const res = await fetch(`/api/billing/status?sessionId=${encodeURIComponent(sessionId)}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error?.message ?? "No se pudo cargar el estado de suscripción");
        }

        setBilling(data.billing as BillingStatus);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error cargando cuenta";
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    void loadBillingStatus();
  }, []);

  async function openBillingPortal() {
    setPortalLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/billing/create-portal-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: getSessionId() }),
      });

      const data = await res.json();
      if (!res.ok || !data?.portalUrl) {
        throw new Error(data?.error?.message ?? "No se pudo abrir el portal de facturación");
      }

      window.location.href = data.portalUrl;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error abriendo el portal";
      setError(message);
    } finally {
      setPortalLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen bg-[#f3f5fb] text-[#111827]">
      <aside className="hidden w-72 border-r border-[#dde3f0] bg-[#eef2fb] md:flex md:flex-col">
        <div className="border-b border-[#dde3f0] px-5 py-4">
          <p className="text-lg font-semibold tracking-tight">Nutrimerca</p>
          <p className="mt-1 text-xs text-[#5b667a]">Área de cuenta</p>
          <a href="/chat" className="mt-4 block w-full rounded-xl bg-[#2f6fed] px-3 py-2 text-center text-sm font-semibold text-white hover:bg-[#265bd1]">
            Ir al chat
          </a>
        </div>

        <div className="flex-1 px-4 py-4">
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-[#6c7892]">Accesos</p>
          <div className="space-y-1 text-sm">
            <a href="/chat" className="block rounded-lg px-3 py-2 text-[#42506d] hover:bg-white">Chat</a>
            <a href="/cuenta" className="block rounded-lg bg-white px-3 py-2 font-medium text-[#1f2a44] shadow-sm">Cuenta</a>
            <a href="/" className="block rounded-lg px-3 py-2 text-[#42506d] hover:bg-white">Inicio</a>
          </div>
        </div>

        <div className="border-t border-[#dde3f0] p-4">
          <a href="/cuenta" className="flex items-center gap-3 rounded-xl bg-white px-3 py-3 shadow-sm">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#d9e4ff] text-xs font-bold text-[#3158b8]">NM</span>
            <span className="text-sm font-medium text-[#1f2a44]">Mi cuenta</span>
          </a>
        </div>
      </aside>

      <section className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-[#dfe5f2] bg-white/85 px-4 py-3 backdrop-blur md:px-8">
          <div>
            <h1 className="text-base font-semibold md:text-lg">Cuenta y facturación</h1>
            <p className="text-xs text-[#667187]">Resumen de suscripción y estado de cobro</p>
          </div>
          <a href="/chat" className="rounded-lg border border-[#d2dbec] bg-white px-3 py-1.5 text-xs font-semibold text-[#1f2a44] hover:bg-[#f8faff]">
            Volver al chat
          </a>
        </header>

        <div className="mx-auto w-full max-w-4xl px-3 py-4 md:px-6 md:py-6">
          <section className="rounded-2xl border border-[#d7deee] bg-white p-5 shadow-sm">
            {loading ? (
              <p className="text-[#5f6d88]">Cargando estado de suscripción...</p>
            ) : error ? (
              <p className="text-red-600">{error}</p>
            ) : billing ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <article className="rounded-xl border border-[#dbe2f0] bg-[#f8faff] p-4">
                  <p className="text-xs uppercase tracking-wide text-[#6b7894]">Plan actual</p>
                  <p className="mt-1 text-lg font-semibold text-[#1f2a44]">{formatPlan(billing.plan)}</p>
                </article>
                <article className="rounded-xl border border-[#dbe2f0] bg-[#f8faff] p-4">
                  <p className="text-xs uppercase tracking-wide text-[#6b7894]">Estado</p>
                  <p className="mt-1 text-lg font-semibold text-[#1f2a44]">{billing.status}</p>
                </article>
                <article className="rounded-xl border border-[#dbe2f0] bg-[#f8faff] p-4">
                  <p className="text-xs uppercase tracking-wide text-[#6b7894]">Renovación</p>
                  <p className="mt-1 text-lg font-semibold text-[#1f2a44]">
                    {billing.currentPeriodEnd ? new Date(billing.currentPeriodEnd).toLocaleDateString() : "No aplica"}
                  </p>
                </article>
                <article className="rounded-xl border border-[#dbe2f0] bg-[#f8faff] p-4">
                  <p className="text-xs uppercase tracking-wide text-[#6b7894]">Cancelación fin de periodo</p>
                  <p className="mt-1 text-lg font-semibold text-[#1f2a44]">{billing.cancelAtPeriodEnd ? "Sí" : "No"}</p>
                </article>

                <div className="sm:col-span-2">
                  <p className="mb-3 text-sm text-[#5f6d88]">
                    Acceso: {billing.isPro ? <strong className="text-[#1f2a44]">Pro activo ✅</strong> : <strong>Free / Starter</strong>}
                  </p>

                  {billing.plan !== "free" ? (
                    <button
                      onClick={openBillingPortal}
                      disabled={portalLoading}
                      className="rounded-lg bg-[#2f6fed] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {portalLoading ? "Abriendo portal..." : "Gestionar facturación"}
                    </button>
                  ) : (
                    <a href="/#precios" className="inline-block rounded-lg border border-[#d2dbec] bg-white px-4 py-2 text-sm font-semibold text-[#31415f]">
                      Ver planes
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-[#5f6d88]">Sin datos de cuenta disponibles por ahora.</p>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
