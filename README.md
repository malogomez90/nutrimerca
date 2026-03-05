# Nutrimerca

Landing + demo de chat nutricional con Next.js (App Router), Tailwind CSS y ruta API (`/api/chat`) conectada a OpenAI.

## Stack

- Next.js 16 (App Router)
- React 19 + TypeScript
- Tailwind CSS v4
- API route server-side en `src/app/api/chat/route.ts`
- Dataset CSV en `data/foods_dataset_final.csv`

---

## Desarrollo local

### 1) Instalar dependencias

```bash
npm install
```

### 2) Configurar variables de entorno

1. Copia `.env.example` como `.env.local`
2. Rellena valores reales

```bash
copy .env.example .env.local
```

Variables mínimas:

- `OPENAI_API_KEY`
- `OPENAI_MODEL` (ejemplo: `gpt-5.2`)
- `DATABASE_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_PRO_MONTHLY`
- `STRIPE_PRICE_PRO_ANNUAL`
- `APP_URL`

### 3) Ejecutar app

```bash
npm run dev
```

Abrir: `http://localhost:3000`

---

## Comprobaciones antes de producción

```bash
npm run lint
npm run build
```

Ambos comandos deben pasar sin errores.

---

## Despliegue recomendado (Vercel)

### Opción A: desde dashboard (recomendado)

1. Sube el repo a GitHub/GitLab/Bitbucket.
2. En Vercel: **Add New Project** → importa el repo.
3. Framework detectado: **Next.js**.
4. Configura variables de entorno de producción:
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL`
   - `APP_URL=https://tu-dominio.com`
   - `DATABASE_URL=postgresql://...`
   - `STRIPE_SECRET_KEY=sk_live_...`
   - `STRIPE_PRICE_PRO_MONTHLY=price_...` (live)
   - `STRIPE_PRICE_PRO_ANNUAL=price_...` (live)
   - `STRIPE_WEBHOOK_SECRET=whsec_...` (se obtiene al crear el endpoint webhook en Stripe)
5. Deploy.
6. Añade dominio personalizado en **Settings → Domains**.

### Opción B: con CLI

```bash
npm i -g vercel
vercel
vercel --prod
```

---

## Checklist de go-live

- [ ] `npm run lint` OK
- [ ] `npm run build` OK
- [ ] Variables de entorno configuradas en Vercel
- [ ] `/api/chat` responde en producción
- [ ] Flujo demo 5 mensajes validado
- [ ] Stripe checkout funcionando
- [ ] Webhook Stripe sincronizando estado de suscripción
- [ ] Dominio + HTTPS activos

### Checklist Stripe en producción (obligatorio)

1. Stripe Dashboard (modo **live**) → crear/verificar producto `Nutrimerca Pro`.
2. Confirmar precios live:
   - mensual (`price_...`)
   - anual (`price_...`)
3. Copiar esos IDs live a Vercel (`STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_PRICE_PRO_ANNUAL`).
4. Crear endpoint webhook en Stripe:
   - URL: `https://tu-dominio.com/api/billing/webhook`
   - Eventos mínimos:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.paid`
     - `invoice.payment_failed`
5. Copiar `whsec_...` en Vercel como `STRIPE_WEBHOOK_SECRET`.
6. Redeploy tras cualquier cambio de variables.

### Validación post-deploy (2-3 min)

1. Hacer una compra real controlada (importe bajo) desde la landing.
2. Verificar que en Stripe el checkout finaliza sin error.
3. Verificar que `POST /api/billing/webhook` responde 200 en logs de Vercel.
4. Comprobar en app que el usuario queda como Pro (`/api/billing/status` => `isPro: true`).
5. Si procede, cancelar/reembolsar compra de prueba.

---

## Sistema de pagos implementado

Se añadió infraestructura de pagos y suscripciones Pro con Stripe:

- `POST /api/billing/create-checkout-session`
- `POST /api/billing/webhook`
- `GET /api/billing/status`
- `POST /api/billing/create-portal-session`

Y la capa de soporte:

- `src/lib/db.ts` (PostgreSQL + esquema mínimo auto-creable)
- `src/lib/billing.ts` (estado de suscripción, entitlements, idempotencia de eventos)
- `src/lib/stripe.ts` (cliente Stripe)

Además:

- El chat (`/api/chat`) ahora consulta entitlements y no limita mensajes cuando el plan está activo.
- La landing muestra CTA de checkout y paywall al agotar la demo.

### Contratos Rune añadidos

- `specs/payments_checkout.rune`
- `specs/payments_webhook.rune`
- `specs/subscription_entitlements.rune`
- `specs/auth_access.rune`

---

## Nota sobre cuota demo

La cuota de 5 mensajes (`src/lib/demo-quota.ts`) ahora usa PostgreSQL cuando `DATABASE_URL` está configurado, y fallback en memoria cuando no lo está.
