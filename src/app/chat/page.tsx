"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const PROMPTS = [
  "Hazme un día de comidas de 2000 kcal alto en proteína",
  "Cena rápida con alimentos de Mercadona",
  "Ajusta mi dieta para perder grasa sin pasar hambre",
];

function getSessionId() {
  if (typeof window === "undefined") return "server-session";

  const existing = localStorage.getItem("nutrimerca_session_id");
  if (existing) return existing;

  const created = `nm_${crypto.randomUUID()}`;
  localStorage.setItem("nutrimerca_session_id", created);
  return created;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [remainingMessages, setRemainingMessages] = useState(5);
  const [totalMessages, setTotalMessages] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<"free" | "starter_monthly" | "pro_monthly" | "pro_annual">("free");
  const [selectedPlan, setSelectedPlan] = useState<"starter_monthly" | "pro_monthly" | "pro_annual">("starter_monthly");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [billingLoading, setBillingLoading] = useState(true);

  useEffect(() => {
    async function loadBillingStatus() {
      try {
        const sessionId = getSessionId();
        const res = await fetch(`/api/billing/status?sessionId=${encodeURIComponent(sessionId)}`);
        if (!res.ok) return;
        const data = await res.json();
        setIsPro(Boolean(data?.billing?.isPro));
        if (typeof data?.billing?.plan === "string") {
          setCurrentPlan(data.billing.plan);
        }
        if (data?.billing?.plan === "starter_monthly") {
          setTotalMessages(30);
          setRemainingMessages(30);
        } else if (data?.billing?.plan === "pro_monthly" || data?.billing?.plan === "pro_annual") {
          setTotalMessages(150);
          setRemainingMessages(150);
        } else {
          setTotalMessages(5);
          setRemainingMessages(5);
        }
      } finally {
        setBillingLoading(false);
      }
    }

    void loadBillingStatus();
  }, []);

  const canSend = useMemo(
    () => input.trim().length > 0 && !loading && remainingMessages > 0,
    [input, loading, remainingMessages]
  );

  async function startCheckout(plan = selectedPlan) {
    setCheckoutLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/billing/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: getSessionId(), plan }),
      });

      const data = await res.json();
      if (!res.ok || !data?.checkoutUrl) {
        throw new Error(data?.error?.message ?? "No se pudo iniciar el checkout");
      }

      window.location.href = data.checkoutUrl;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error iniciando checkout";
      setError(message);
    } finally {
      setCheckoutLoading(false);
    }
  }

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
      const message = err instanceof Error ? err.message : "Error abriendo facturación";
      setError(message);
    } finally {
      setPortalLoading(false);
    }
  }

  async function sendMessage(e?: FormEvent<HTMLFormElement>) {
    e?.preventDefault();
    const content = input.trim();
    if (!content || loading) return;

    const nextMessages = [...messages, { role: "user" as const, content }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: getSessionId(),
          profile: { restrictions: [] },
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data?.error?.code === "QUOTA_EXCEEDED") setRemainingMessages(0);
        throw new Error(data?.error?.message ?? "Error inesperado en el chat");
      }

      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      if (typeof data?.usage?.isPro === "boolean") setIsPro(data.usage.isPro);
      if (typeof data?.usage?.plan === "string") setCurrentPlan(data.usage.plan);
      if (typeof data?.usage?.remainingMessages === "number") setRemainingMessages(data.usage.remainingMessages);
      if (typeof data?.usage?.totalMessages === "number") setTotalMessages(data.usage.totalMessages);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error inesperado";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  const planLabel =
    currentPlan === "starter_monthly"
      ? "Starter"
      : currentPlan === "pro_monthly" || currentPlan === "pro_annual"
        ? "Pro"
        : "Free";

  return (
    <main className="flex min-h-screen bg-[#f3f5fb] text-[#111827]">
      <aside className="hidden w-72 border-r border-[#dde3f0] bg-[#eef2fb] md:flex md:flex-col">
        <div className="border-b border-[#dde3f0] px-5 py-4">
          <p className="text-lg font-semibold tracking-tight">Nutrimerca</p>
          <p className="mt-1 text-xs text-[#5b667a]">Asistente nutricional</p>
          <a href="/chat" className="mt-4 block w-full rounded-xl bg-[#2f6fed] px-3 py-2 text-center text-sm font-semibold text-white hover:bg-[#265bd1]">
            + Nueva consulta
          </a>
        </div>

        <div className="flex-1 px-4 py-4">
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-[#6c7892]">Accesos</p>
          <div className="space-y-1 text-sm">
            <a href="/chat" className="block rounded-lg bg-white px-3 py-2 font-medium text-[#1f2a44] shadow-sm">Chat</a>
            <a href="/cuenta" className="block rounded-lg px-3 py-2 text-[#42506d] hover:bg-white">Cuenta</a>
            <a href="/" className="block rounded-lg px-3 py-2 text-[#42506d] hover:bg-white">Inicio</a>
          </div>

          <div className="mt-6 rounded-xl border border-[#d8e0ef] bg-white p-3">
            <p className="text-xs uppercase tracking-wide text-[#6c7892]">Plan actual</p>
            <p className="mt-1 text-sm font-semibold text-[#1f2a44]">{planLabel}</p>
            <p className="mt-1 text-xs text-[#5b667a]">
              {billingLoading ? "Cargando..." : `${remainingMessages}/${totalMessages} mensajes`}
            </p>
          </div>
        </div>

        <div className="border-t border-[#dde3f0] p-4">
          <a href="/cuenta" className="flex items-center gap-3 rounded-xl bg-white px-3 py-3 shadow-sm hover:bg-[#f8faff]">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#d9e4ff] text-xs font-bold text-[#3158b8]">NM</span>
            <span className="text-sm font-medium text-[#1f2a44]">Mi cuenta</span>
          </a>
        </div>
      </aside>

      <section className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-[#dfe5f2] bg-white/85 px-4 py-3 backdrop-blur md:px-8">
          <div>
            <h1 className="text-base font-semibold md:text-lg">Chat nutricional</h1>
            <p className="text-xs text-[#667187]">Respuestas prácticas con alimentos habituales</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-[#d2dbec] bg-[#f8faff] px-3 py-1 text-xs font-medium text-[#485774]">Plan {planLabel}</span>
            <a href="/cuenta" className="rounded-lg border border-[#d2dbec] bg-white px-3 py-1.5 text-xs font-semibold text-[#1f2a44] hover:bg-[#f8faff] md:hidden">Cuenta</a>
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-3 py-4 md:px-6 md:py-6">
          <div className="mb-3 flex flex-wrap gap-2">
            {PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => setInput(prompt)}
                className="rounded-full border border-[#d2dbec] bg-white px-3 py-1.5 text-xs text-[#33415c] hover:bg-[#f8faff] md:text-sm"
              >
                {prompt}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto rounded-2xl border border-[#d7deee] bg-white p-4 shadow-sm md:p-6">
            {messages.length === 0 && (
              <div className="mx-auto max-w-xl rounded-xl border border-dashed border-[#cfd8eb] bg-[#f8faff] p-5 text-center">
                <p className="text-sm text-[#4c5b7a]">Empieza escribiendo tu objetivo y te propongo una estrategia de comida realista.</p>
              </div>
            )}

            <div className="space-y-4">
              {messages.map((m, idx) => (
                <div
                  key={`${m.role}-${idx}`}
                  className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm ${
                    m.role === "user"
                      ? "ml-auto border border-[#d4def4] bg-[#edf3ff] text-[#1f2a44]"
                      : "mr-auto border border-[#d9e8d9] bg-[#effaf0] text-[#1f2a44]"
                  }`}
                >
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#6b7894]">{m.role === "user" ? "Tú" : "Nutrimerca"}</p>
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
              ))}
            </div>

            {loading && <p className="mt-4 text-sm text-[#6c7892]">Nutrimerca está escribiendo...</p>}
            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
          </div>

          <div className="mt-4 rounded-2xl border border-[#d7deee] bg-white p-3 shadow-sm">
            <form onSubmit={sendMessage} className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribe tu objetivo, restricciones o tu menú actual..."
                className="flex-1 rounded-xl border border-[#d2dbec] bg-[#f9fbff] px-3 py-2 text-sm outline-none focus:border-[#7c9de9]"
              />
              <button disabled={!canSend} className="rounded-xl bg-[#2f6fed] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Enviar</button>
            </form>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[#5f6d88]">
              <p>Uso: <strong>{remainingMessages}</strong>/<strong>{totalMessages}</strong> mensajes disponibles.</p>
              {(currentPlan === "free" || currentPlan === "starter_monthly") && (
                <div className="flex gap-2">
                  <button
                    onClick={() => startCheckout(selectedPlan)}
                    disabled={checkoutLoading}
                    className="rounded-lg border border-[#c7d5f3] bg-[#f3f7ff] px-3 py-1.5 font-semibold text-[#2f4e99]"
                  >
                    {checkoutLoading ? "Abriendo checkout..." : "Mejorar plan"}
                  </button>
                  {(currentPlan === "starter_monthly" || isPro) && (
                    <button
                      onClick={openBillingPortal}
                      disabled={portalLoading || billingLoading}
                      className="rounded-lg border border-[#d2dbec] bg-white px-3 py-1.5 font-semibold text-[#31415f]"
                    >
                      {portalLoading ? "Abriendo..." : "Facturación"}
                    </button>
                  )}
                </div>
              )}
            </div>

            {!isPro && remainingMessages === 0 && (
              <div className="mt-3 rounded-xl border border-[#f0d6a7] bg-[#fff8ea] p-3 text-xs text-[#705117]">
                <p className="font-semibold">Has alcanzado el límite de tu plan actual.</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedPlan("starter_monthly")}
                    className={`rounded-full px-3 py-1 ${selectedPlan === "starter_monthly" ? "bg-[#2f6fed] text-white" : "border border-[#d6dff1] bg-white text-[#42506d]"}`}
                  >Starter</button>
                  <button
                    onClick={() => setSelectedPlan("pro_monthly")}
                    className={`rounded-full px-3 py-1 ${selectedPlan === "pro_monthly" ? "bg-[#2f6fed] text-white" : "border border-[#d6dff1] bg-white text-[#42506d]"}`}
                  >Pro mensual</button>
                  <button
                    onClick={() => setSelectedPlan("pro_annual")}
                    className={`rounded-full px-3 py-1 ${selectedPlan === "pro_annual" ? "bg-[#2f6fed] text-white" : "border border-[#d6dff1] bg-white text-[#42506d]"}`}
                  >Pro anual</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
