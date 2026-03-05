"use client";

import { FormEvent, useMemo, useState } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const PROMPTS = [
  "Cena rápida alta en protes sin cocinar",
  "Dieta de volumen variada de 3000 kcal",
  "Alternativas sanas a los cereales",
];

function getSessionId() {
  if (typeof window === "undefined") return "server-session";

  const existing = localStorage.getItem("nutrimerca_session_id");
  if (existing) return existing;

  const created = `nm_${crypto.randomUUID()}`;
  localStorage.setItem("nutrimerca_session_id", created);
  return created;
}

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [remainingFreeMessages, setRemainingFreeMessages] = useState(5);
  const [error, setError] = useState<string | null>(null);

  const canSend = useMemo(
    () => input.trim().length > 0 && !loading && remainingFreeMessages >= 0,
    [input, loading, remainingFreeMessages]
  );

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
          profile: {
            restrictions: [],
          },
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error?.message ?? "Error inesperado en el chat");
      }

      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      setRemainingFreeMessages(data?.usage?.remainingFreeMessages ?? remainingFreeMessages);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error inesperado";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="bg-white text-zinc-900">
      <nav className="sticky top-0 z-20 border-b border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-lg font-bold">Nutrimerca</span>
          <div className="hidden gap-6 text-sm md:flex">
            <a href="#como-funciona">Cómo funciona</a>
            <a href="#demo">Demo</a>
            <a href="#precios">Precios</a>
            <a href="#faq">FAQ</a>
          </div>
          <button className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white">
            Crear mi dieta gratis
          </button>
        </div>
      </nav>

      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-16 md:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="mb-3 inline-block rounded-full bg-emerald-100 px-3 py-1 text-sm text-emerald-700">
            Cero monotonía. Cero ingredientes raros.
          </p>
          <h1 className="text-4xl font-bold leading-tight md:text-5xl">
            Dietas variadas que sí puedes seguir, apoyadas en tus básicos de Mercadona.
          </h1>
          <p className="mt-4 text-zinc-600">
            Un chat inteligente que te ayuda con objetivos, calorías, macros y alternativas realistas con alimentos de tu día a día.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="#demo"
              className="rounded-full bg-emerald-500 px-6 py-3 font-semibold text-white"
            >
              Crear mi primera dieta gratis
            </a>
            <button className="rounded-full border border-zinc-300 px-6 py-3 font-semibold">
              ▶ Ver cómo funciona
            </button>
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
          <p className="text-sm text-zinc-500">Usuario</p>
          <p className="mt-1 rounded-lg bg-white p-3 text-sm">
            Quiero perder grasa. Hazme una dieta de 1800 kcal alta en protes.
          </p>
          <p className="mt-4 text-sm text-zinc-500">Nutrimerca</p>
          <p className="mt-1 rounded-lg bg-emerald-50 p-3 text-sm">
            ¡Hecho! Combinaremos frescos y básicos del súper con macros equilibrados.
          </p>
        </div>
      </section>

      <section id="como-funciona" className="mx-auto max-w-6xl px-6 py-8">
        <h2 className="text-2xl font-bold">Cómo funciona</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <article className="rounded-xl border p-4">1) Dime objetivo, restricciones y tiempo.</article>
          <article className="rounded-xl border p-4">2) Recibe menú variado con macros.</article>
          <article className="rounded-xl border p-4">3) Ajusta platos al momento.</article>
        </div>
      </section>

      <section id="demo" className="mx-auto max-w-6xl px-6 py-12">
        <h2 className="text-2xl font-bold">Demo interactiva</h2>
        <p className="mt-2 text-zinc-600">Tienes 5 mensajes gratis para probar el chat.</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => setInput(prompt)}
              className="rounded-full border border-zinc-300 px-3 py-1 text-sm"
            >
              {prompt}
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="mb-3 max-h-80 space-y-3 overflow-y-auto pr-1">
            {messages.length === 0 && (
              <p className="text-sm text-zinc-500">Empieza escribiendo tu objetivo nutricional.</p>
            )}
            {messages.map((m, idx) => (
              <div
                key={`${m.role}-${idx}`}
                className={`rounded-xl p-3 text-sm ${
                  m.role === "user" ? "ml-8 bg-white" : "mr-8 bg-emerald-50"
                }`}
              >
                <p className="mb-1 text-xs uppercase text-zinc-500">{m.role === "user" ? "Tú" : "Nutrimerca"}</p>
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>
            ))}
            {loading && <p className="text-sm text-zinc-500">Nutrimerca está escribiendo...</p>}
          </div>

          <form onSubmit={sendMessage} className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu objetivo..."
              className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
            <button
              disabled={!canSend}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Enviar
            </button>
          </form>

          <p className="mt-3 text-sm text-zinc-600">Te quedan {remainingFreeMessages}/5 mensajes gratis.</p>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
      </section>

      <section id="precios" className="mx-auto max-w-6xl px-6 py-12">
        <h2 className="text-2xl font-bold">Precios</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <article className="rounded-xl border p-5">
            <h3 className="font-semibold">Starter</h3>
            <p className="mt-2 text-3xl font-bold">9€/mes</p>
            <p className="mt-2 text-sm text-zinc-600">30 dietas/mes, historial 7 días.</p>
          </article>
          <article className="rounded-xl border-2 border-emerald-500 p-5">
            <h3 className="font-semibold">Pro</h3>
            <p className="mt-2 text-3xl font-bold">15€/mes</p>
            <p className="mt-2 text-sm text-zinc-600">Ilimitado, historial permanente, exportación.</p>
          </article>
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-6xl px-6 py-12">
        <h2 className="text-2xl font-bold">FAQ</h2>
        <div className="mt-4 space-y-2 text-sm text-zinc-700">
          <p><strong>¿Tengo que comprar todo en Mercadona?</strong> No, puedes combinar con cualquier súper.</p>
          <p><strong>¿Nutrimerca hace la compra?</strong> No, te da menú + lista.</p>
          <p><strong>¿Sirve para vegano/celíaco?</strong> Sí, indicando restricciones en el chat.</p>
        </div>
      </section>
    </main>
  );
}
