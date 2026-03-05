---
name: rune-writer
description: Crea especificaciones RUNE a partir de requerimientos e implementa código basado en especificaciones. Úsalo cuando el usuario pida un contrato RUNE (YAML o Markdown) o necesite programar código a partir de un contrato existente.
license: MIT
---

Para la referencia completa del patrón RUNE, consulta [SPEC.md](../../SPEC.md).

---

## El Patrón

Todo contrato RUNE define estos campos:

| Campo | Obligatorio | Propósito |
|-------|----------|---------|
| SIGNATURE | Sí | Interfaz exacta de la función usando la sintaxis del lenguaje destino |
| INTENT | Sí | Qué hace la función, 1-3 frases |
| BEHAVIOR | Sí | Reglas lógicas en formato CUANDO/ENTONCES (WHEN/THEN) |
| TESTS | Sí | Mínimo 3: camino feliz, caso límite (boundary), error |
| CONSTRAINTS | No | Reglas de validación de entrada |
| EDGE_CASES | No | Casos límite y comportamiento esperado |
| DEPENDENCIES | No | Librerías externas |
| EXAMPLES | No | Ejemplos de uso |
| COMPLEXITY | No | Notación Big-O tiempo/espacio |

### Reglas

- SIGNATURE debe usar la sintaxis real del lenguaje destino, no pseudocódigo.
- BEHAVIOR debe usar el formato WHEN/THEN (CUANDO/ENTONCES) — cada regla de negocio = una cláusula.
- TESTS debe tener al menos 3 casos: un camino feliz, un límite, un error.
- INTENT debe ser 1-3 frases, suficientemente claro para usarlo como docstring.
- Cada regla en BEHAVIOR debe tener al menos un test correspondiente.
- Los mensajes de error en BEHAVIOR deben ser específicos, no genéricos.

---

## Formato: YAML (archivos .rune)

Usa archivos `.rune` independientes cuando quieras contratos formales y analizables. El SIGNATURE usa la sintaxis real del lenguaje:

```yaml
---
meta:
  name: validar_cupon
  language: python
  version: 1.0
  tags: [e-commerce, validacion]
---

RUNE: validar_cupon

SIGNATURE: |
  def validar_cupon(codigo: str, cupones: list[dict], fecha_actual: str) -> tuple[bool, str]

INTENT: |
  Valida un código de cupón contra una lista de cupones activos. 
  Comprueba existencia, caducidad y valor. Búsqueda insensible a mayúsculas.

BEHAVIOR:
  - WHEN código está vacío THEN return (False, "El código no puede estar vacío")
  - WHEN código no se encuentra THEN return (False, "Cupón no encontrado")
  - WHEN cupón ha caducado THEN return (False, "Cupón caducado")
  - OTHERWISE return (True, cupon_encontrado)

TESTS:
  - "validar_cupon('SAVE10', [...], '2025-01-15')[0] == True"
  - "validar_cupon('save10', [...], '2025-01-15')[0] == True"
  - "validar_cupon('INVALIDO', [...], '2025-01-15')[0] == False"
  - "validar_cupon('', [], '2025-01-15')[0] == False"
```

El patrón es el mismo en todos los lenguajes. Solo cambian la sintaxis de SIGNATURE y las convenciones de nombres.

## Formato: Markdown (incrustado en cualquier .md)

Usa secciones markdown cuando incrustes contratos dentro de AGENTS.md u otros documentos:

```markdown
### validar_cupon

**SIGNATURE:** `def validar_cupon(codigo: str, cupones: list[dict], fecha_actual: str) -> tuple[bool, str]`

**INTENT:** Valida un código de cupón contra cupones activos. Comprueba existencia, caducidad y valor. Insensible a mayúsculas.

**BEHAVIOR:**
- WHEN código está vacío THEN return (False, "El código no puede estar vacío")
- WHEN código no se encuentra THEN return (False, "Cupón no encontrado")
- WHEN cupón ha caducado THEN return (False, "Cupón caducado")
- OTHERWISE return (True, cupon_encontrado)

**TESTS:**
- `validar_cupon('SAVE10', [...], '2025-01-15')[0] == True`
- `validar_cupon('', [], '2025-01-15')[0] == False`
```

Ambos formatos contienen la misma información. La IA los trata de forma idéntica.

---

## Generar Contratos a partir de Requerimientos

Cuando un usuario describa lo que necesita en lenguaje natural, genera un contrato RUNE.

### Proceso

1. **Extrae del requerimiento:**
   - ¿Cuál es el propósito de la función?
   - ¿Cuáles son las entradas y salidas?
   - ¿Cuáles son las reglas de negocio?
   - ¿Qué podría salir mal? (casos límite)

2. **Mapea cada regla de negocio a una cláusula WHEN/THEN** en BEHAVIOR.

3. **Deriva CONSTRAINTS** de las descripciones de entrada ("debe ser positivo", "entre 0 y 100").

4. **Deriva EDGE_CASES** de los límites (entrada vacía, cero, valor máximo, tipos inválidos).

5. **Escribe TESTS** que verifiquen cada regla de BEHAVIOR más los casos límite. Mínimo 3, idealmente 8-15.

6. **Pregunta al usuario** qué formato prefiere (archivo YAML .rune o sección Markdown). Si no está claro, usa el formato por defecto de su proyecto.

7. **Valida el contrato** contra la lista de verificación (checklist) antes de presentárselo.

---

## Validar Contratos

Cuando se te pida validar un contrato, o antes de presentar uno que hayas generado, comprueba:

### Estructura
- [ ] Todos los campos obligatorios están presentes: SIGNATURE, INTENT, BEHAVIOR, TESTS
- [ ] Si es YAML: sintaxis YAML válida, sección meta con nombre y lenguaje
- [ ] Si es Markdown: los encabezados usan nombres de campo en negrita, el código en backticks

### Contenido
- [ ] SIGNATURE usa sintaxis real del lenguaje (no pseudocódigo)
- [ ] BEHAVIOR usa formato WHEN/THEN
- [ ] TESTS tiene al menos 3 casos (camino feliz, límite, error)
- [ ] INTENT tiene 1-3 frases
- [ ] Cada regla en BEHAVIOR tiene al menos un test
- [ ] Cada EDGE_CASE tiene un test correspondiente
- [ ] Los mensajes de error son específicos (no genéricos "entrada inválida")

---

## Implementar desde Contratos

Cuando se te entregue un contrato RUNE (en cualquier formato) para implementar, genera código que lo siga al pie de la letra.

### Proceso

1. **Usa el SIGNATURE exacto** — nombre de función, parámetros, tipos, tipo de retorno.
2. **Implementa cada regla BEHAVIOR** en orden — cada WHEN/THEN se convierte en una rama condicional (if/else) en el lenguaje destino.
3. **Añade validación de entrada** basándote en CONSTRAINTS.
4. **Maneja cada EDGE_CASE**.
5. **Añade un comentario de documentación** basado en INTENT (docstring, JSDoc, GoDoc, rustdoc, etc.).
6. **Genera pruebas** basándote en TESTS utilizando el framework de testing del lenguaje destino.

### Reglas

- NUNCA te desvíes del SIGNATURE.
- Implementa TODAS las reglas BEHAVIOR, no solo algunas.
- Cada elemento en TESTS debe tener una función de prueba correspondiente en el archivo de tests.
- Los mensajes de error del código deben coincidir exactamente con los especificados en BEHAVIOR.
- Sigue las convenciones y buenas prácticas del lenguaje destino.