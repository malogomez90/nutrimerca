"use client";

import { useEffect, useState } from "react";

type BillingStatus = {
  isPro: boolean;
  plan: "free" | "pro_monthly" | "pro_annual";
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
  if (plan === "pro_monthly") return "Pro mensual";
  if (plan === "pro_annual") return "Pro anual";
  return "Free";
}

export default function CuentaPage() {
  const [emailInput, setEmailInput] = useState("");
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadBillingStatus() {
      try {
        const sessionId = getSessionId();
        const savedEmail = localStorage.getItem("nutrimerca_account_email");
        if (savedEmail) {
          setAccountEmail(savedEmail);
          setEmailInput(savedEmail);
        }

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

  async function loginByEmail() {
    setLoginLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: getSessionId(),
          email: emailInput,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data?.user?.email) {
        throw new Error(data?.error?.message ?? "No se pudo iniciar sesión");
      }

      const normalizedEmail = String(data.user.email);
      setAccountEmail(normalizedEmail);
      setEmailInput(normalizedEmail);
      localStorage.setItem("nutrimerca_account_email", normalizedEmail);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error iniciando sesión";
      setError(message);
    } finally {
      setLoginLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-zinc-900">
      <a href="/" className="text-sm text-emerald-700">← Volver al inicio</a>
      <h1 className="mt-3 text-3xl font-bold">Mi cuenta</h1>
      <p className="mt-2 text-zinc-600">Panel mínimo de suscripción y facturación.</p>

      <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <h2 className="text-lg font-semibold">Acceso básico</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Vincula tu email a esta sesión para recuperar estado de cuenta.
          </p>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="tu@email.com"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
            <button
              onClick={loginByEmail}
              disabled={loginLoading}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loginLoading ? "Guardando..." : "Guardar email"}
            </button>
          </div>

          {accountEmail && (
            <p className="mt-2 text-sm text-emerald-700">
              Email vinculado: <strong>{accountEmail}</strong>
            </p>
          )}
        </div>

        {loading ? (
          <p className="text-zinc-600">Cargando estado de suscripción...</p>
        ) : error ? (
          <p className="text-red-600">{error}</p>
        ) : billing ? (
          <div className="space-y-3">
            <p>
              Plan actual: <strong>{formatPlan(billing.plan)}</strong>
            </p>
            <p>
              Estado: <strong>{billing.status}</strong>
            </p>
            <p>
              Acceso: {billing.isPro ? <strong className="text-emerald-700">Pro activo ✅</strong> : <strong>Free</strong>}
            </p>
            <p>
              Próxima renovación: {billing.currentPeriodEnd ? new Date(billing.currentPeriodEnd).toLocaleDateString() : "No aplica"}
            </p>
            <p>
              Cancelación al final del periodo: {billing.cancelAtPeriodEnd ? "Sí" : "No"}
            </p>

            {billing.isPro ? (
              <button
                onClick={openBillingPortal}
                disabled={portalLoading}
                className="mt-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {portalLoading ? "Abriendo portal..." : "Gestionar facturación"}
              </button>
            ) : (
              <a
                href="/#precios"
                className="inline-block rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold"
              >
                Ver planes
              </a>
            )}
          </div>
        ) : (
          <p className="text-zinc-600">Sin datos de cuenta disponibles por ahora.</p>
        )}
      </section>
    </main>
  );
}
