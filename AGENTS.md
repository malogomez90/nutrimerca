# Contexto del Proyecto

**Estado:** Inicialización (Día 1)
**Metodología:** Rune-stone estricto en módulos críticos + GPT-5.2 flexible en generación conversacional.

## Stack tecnológico definitivo

- **Frontend:** Next.js (App Router) + React + TypeScript
- **Estilos:** Tailwind CSS
- **Backend:** API Routes de Next.js (`/api/chat`)
- **IA:** OpenAI GPT-5.2
- **Datos:** CSV Mercadona en `data/foods_dataset_final.csv`
- **Calidad:** ESLint

## Principio de producto (prioridad absoluta)

**El comportamiento nativo de ChatGPT (naturalidad, versatilidad, fluidez, formato libre) NO se altera.**

Rune-stone se usa únicamente para contratos técnicos en infraestructura crítica (entradas/salidas, errores, límites, seguridad y consistencia de datos), nunca para rigidizar el estilo conversacional.

## Plan maestro (fuente de verdad)

Este proyecto se desarrolla siguiendo el plan:

**`plan.md`** (raíz del proyecto)

- **Arquitectura:** Landing (Next.js + Tailwind) + API `/api/chat` + GPT 5.2 + dataset CSV (Mercadona).
- **Mapa de página:** Navbar, Hero, Trust, Enemigo, Qué es + Cómo funciona, Demo interactiva (5 mensajes gratis), Journeys, Timeline, Comparativa, Actualización continua, Social proof, Pricing, Privacidad, Limitaciones, FAQ, CTA, Footer, Exit intent, Sticky CTA mobile.
- **Orden de implementación:** Setup → Backend (API + CSV + GPT 5.2) → Hero/Navbar/Trust → Demo Chat → resto de secciones → pulido.

Antes de proponer cambios de alcance, estructura o flujo, consulta el plan.

## Reglas del proyecto

- **Regla de oro:** CERO CÓDIGO NUEVO EN ÁREAS CRÍTICAS SIN CONTRATO `.rune` APROBADO.
- **Áreas críticas** (obligatorio contrato): API, cuota demo, validaciones de negocio, manejo de errores, seguridad y consistencia de datos.
- **CSV (modo pragmático):** contrato **mínimo** obligatorio para lectura segura y esquema base; filtrado avanzado puede evolucionar por fases.
- **Áreas creativas** (sin contrato formal): prompts conversacionales, copy de landing, formato de respuesta del chat.
- **Idioma:** Responde SIEMPRE en español.

## Skills por defecto (módulos críticos)

| Skill | Cuándo usarla |
|-------|----------------|
| **rune-writer** | Crear contratos desde requisitos. Implementar código a partir de contratos aprobados. |
| **rune-validator** | Verificar que un contrato cumpla el formato y las reglas. |
| **rune-refiner** | Detectar agujeros lógicos, casos límite y ambigüedades en contratos. |
| **rune-from-code** | Extraer contratos de código existente (ingeniería inversa). |

Rol por defecto: `rune-writer`.

## Qué requiere contrato y qué no

**SÍ requiere contrato `.rune`:**
- API route `/api/chat` (entrada, salida, errores, timeout, seguridad básica).
- Lógica de límite de 5 mensajes gratis en la demo.
- Validaciones de restricciones nutricionales cuando afecten reglas de negocio.
- Contrato mínimo de lectura CSV (esquema esperado + parseo seguro + errores claros).

**NO requiere contrato:**
- Contenido y estructura de prompts para GPT-5.2.
- Formato de respuestas del chat (markdown, listas, narrativa libre, etc.).
- Copy y estructura visual de la landing (según `plan.md`).
- Flujos de conversación para planes nutricionales.

## Orden operativo obligatorio

1. Definir/actualizar contrato `.rune` del módulo crítico.
2. Validar contrato (`rune-validator`) y refinar (`rune-refiner`).
3. Obtener aprobación humana del contrato.
4. Implementar código derivado del contrato.
5. Si existe código crítico sin contrato: extraer contrato primero (`rune-from-code`) y regularizar.