---
name: rune-validator
description: Valida especificaciones RUNE comprobando que cumplen todas las reglas del patrón. Úsalo cuando recibas un archivo .rune o una sección Markdown que necesite ser revisada para asegurar que está completa, bien formateada y es consistente internamente.
license: MIT
---

## Cómo usarlo

Cuando se te pida **validar un contrato RUNE**, ejecuta todas las comprobaciones de abajo y devuelve un informe estructurado.

Entrada: un archivo YAML `.rune` o una sección Markdown que siga el patrón RUNE.

---

## Lista de Comprobación (Checklist) de Validación

### 1. Comprobaciones de Estructura

Ejecuta estas comprobaciones primero. Si alguna falla, el contrato es inválido.

| # | Regla | Condición para aprobar |
|---|------|---------------|
| S1 | Campos obligatorios presentes | SIGNATURE, INTENT, BEHAVIOR y TESTS deben existir |
| S2 | Cabecera meta YAML (Solo YAML) | `meta.name` y `meta.language` deben estar presentes |
| S3 | Cabecera RUNE coincide con meta.name (Solo YAML) | El valor de `RUNE:` debe ser igual a `meta.name` |
| S4 | Formato Markdown (Solo Markdown) | Los nombres de los campos están en negrita (`**SIGNATURE:**`), el código en backticks |
| S5 | Sintaxis YAML válida (Solo YAML) | El archivo se parsea sin errores YAML |

### 2. Comprobaciones de Contenido

| # | Regla | Condición para aprobar |
|---|------|---------------|
| C1 | SIGNATURE usa sintaxis real del lenguaje | No es pseudocódigo. Usa la sintaxis de declaración de funciones real del lenguaje destino |
| C2 | INTENT tiene 1-3 frases | No más de 3 frases. Sin detalles de implementación (sin algoritmos, regex, nombres de librerías) |
| C3 | BEHAVIOR usa formato WHEN/THEN | Cada regla es una cláusula WHEN/THEN (CUANDO/ENTONCES), con un OTHERWISE opcional como última regla |
| C4 | Reglas BEHAVIOR ordenadas correctamente | Validaciones primero, lógica de negocio después, por defecto (OTHERWISE) al final |
| C5 | TESTS tiene al menos 3 casos | Mínimo: 1 camino feliz, 1 caso límite, 1 caso de error |
| C6 | TESTS usan formato correcto | Cada test es `funcion(entrada) == esperado` o `funcion(entrada) raises TipoDeError` |

### 3. Comprobaciones de Consistencia

| # | Regla | Condición para aprobar |
|---|------|---------------|
| X1 | Toda regla BEHAVIOR tiene un test | Cada cláusula WHEN/THEN está mapeada a por lo menos un caso de prueba |
| X2 | Todo EDGE_CASE tiene un test | Si existe la sección EDGE_CASES, cada entrada mapea a un test |
| X3 | CONSTRAINTS tienen reglas BEHAVIOR | Cada restricción que requiera validación en tiempo de ejecución tiene una regla WHEN/THEN correspondiente |
| X4 | Los mensajes de error coinciden | Los mensajes de error definidos en BEHAVIOR coinciden exactamente con los esperados en TESTS |
| X5 | SIGNATURE coincide con TESTS | El nombre de la función y el conteo de parámetros en TESTS coincide con la SIGNATURE |

---

## Formato de Salida

Devuelve el informe en este formato:

```markdown
## Informe de Validación RUNE: `<nombre_de_la_funcion>`

### Estructura
- [PASS] S1: Campos obligatorios presentes
- [PASS] S2: Cabecera meta YAML válida
- [FAIL] S3: Desajuste en cabecera RUNE — RUNE dice "validar_email" pero meta.name es "validador_email"

### Contenido
- [PASS] C1: SIGNATURE usa sintaxis real del lenguaje
- [WARN] C2: INTENT tiene 4 frases (se recomiendan máximo 3)
- [PASS] C3: BEHAVIOR usa formato WHEN/THEN
...

### Consistencia
- [FAIL] X1: Regla BEHAVIOR "WHEN código está vacío THEN ..." no tiene test correspondiente
- [PASS] X2: Todos los EDGE_CASES tienen tests
...

### Resumen
- **Estado:** FAIL (2 errores, 1 advertencia)
- **Errores:** S3, X1
- **Advertencias:** C2
- **Sugerencias:**
  - Renombra la cabecera RUNE para que coincida con meta.name
  - Añade test: `validar_email('') == (False, "El email no puede estar vacío")`
  - Considera acortar el INTENT a 3 frases
```

---

## Niveles de Gravedad

- **FAIL (FALLO)** — El contrato viola una regla obligatoria. Debe arreglarse antes de la implementación.
- **WARN (AVISO)** — El contrato es técnicamente válido pero tiene un problema de calidad. Debería arreglarse.
- **PASS (OK)** — Regla satisfecha.

---

## Reglas de Comportamiento de la IA

- Siempre ejecuta TODAS las comprobaciones, incluso si las primeras fallan.
- Reporta cada problema encontrado, no solo el primero.
- Por cada FAIL o WARN, incluye una sugerencia específica sobre cómo arreglarlo.
- Si el contrato es válido (todo PASS), dilo claramente.
- No modifiques el contrato por ti mismo — solo reporta los hallazgos.