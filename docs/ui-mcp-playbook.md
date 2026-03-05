# UI MCP Playbook · Nutrimerca

Guía operativa para usar **MCP UI Design Engine** de forma consistente en este proyecto.

## 1) Perfiles visuales oficiales

- **Landing (`/`)** → `light-minimal`
  - objetivo: claridad + conversión
  - reglas: jerarquía tipográfica limpia, espacios amplios, CTA principal claro

- **Producto (`/chat`, `/cuenta`)** → `stripe-clean`
  - objetivo: interfaz SaaS sobria y usable a diario
  - reglas: barra lateral estable, acciones primarias visibles, superficies limpias

## 2) Pipeline obligatorio en cambios visuales grandes

1. `plan_layout`
2. `build_layout`
3. `apply_style_lock`
4. `a11y_patch`
5. `validate_and_fix`
6. `generate_variants` (opcional)

## 3) Prompts base recomendados

### Landing
"Landing page light-minimal para asistente nutricional con hero, cómo funciona, demo, pricing, FAQ y CTA a /chat"

### Chat app
"SaaS dashboard stripe-clean con sidebar izquierda, topbar y área central de chat"

### Cuenta
"Settings/account stripe-clean con plan actual, estado, renovación, cancelación y acción de facturación"

## 4) Criterios de aceptación (Definition of Done)

- Coherencia visual con el perfil asignado (colores, radius, sombras, spacing)
- Sin errores de accesibilidad críticos tras `a11y_patch`
- Sin imports/estructura inválida tras `validate_and_fix`
- `npm run build` exitoso

## 5) Librería de templates recomendada (persistente)

Registrar en `src/templates/registry.ts` (si se habilita en el engine):

- `tpl_nm_hero_landing`
- `tpl_nm_pricing_cards`
- `tpl_nm_chat_shell_sidebar`
- `tpl_nm_chat_input_panel`
- `tpl_nm_usage_status_card`
- `tpl_nm_account_billing_panel`

## 6) Notas de operación

- `save_template` en memoria **no persiste** entre reinicios.
- Evitar mezclar perfiles en la misma vista.
- Mantener revisiones visuales con capturas comparativas por ruta (`/`, `/chat`, `/cuenta`).
