---
name: rune-from-code
description: Hace ingeniería inversa a partir de código existente para extraer una especificación RUNE. Úsalo cuando quieras adoptar la metodología RUNE en proyectos antiguos (código legacy) o necesites generar un contrato para ver cómo funciona una implementación actual.
license: MIT
---

## Cómo usarlo

Cuando se te entregue una función (o método de clase) que ya existe en el código, analízala a fondo y genera un contrato RUNE completo que describa exactamente cómo se comporta en la actualidad.

Entrada: código fuente de una o más funciones (en cualquier lenguaje).
Salida: un archivo YAML `.rune` o una sección Markdown por cada función.

---

## Proceso de Ingeniería Inversa

### Paso 1: Extraer la SIGNATURE (Firma)

Lee la declaración de la función exactamente como está escrita. Usa la sintaxis real del lenguaje de origen:

**Python:**
```python
def calcular_descuento(precio: float, porcentaje: int) -> float:
```
```yaml
SIGNATURE: |
  def calcular_descuento(precio: float, porcentaje: int) -> float
```

**Go:**
```go
func CalcularDescuento(precio float64, porcentaje int) (float64, error) {
```
```yaml
SIGNATURE: |
  func CalcularDescuento(precio float64, porcentaje int) (float64, error)
```

**TypeScript:**
```typescript
function calcularDescuento(precio: number, porcentaje: number): number {
```
```yaml
SIGNATURE: |
  function calcularDescuento(precio: number, porcentaje: number): number
```

Si el lenguaje no tiene tipos (JavaScript puro, Ruby, PHP clásico), deduce los tipos observando:
- Los nombres de los parámetros y cómo se usan dentro de la función.
- Los valores por defecto y las declaraciones de retorno (`return`).
- Añade un comentario en el yaml notando la deducción: `# tipos deducidos por el uso`

### Paso 2: Escribir el INTENT (Intención)

Resume lo que hace la función en 1-3 frases basándote en:
- El nombre de la función.
- Los comentarios o docstrings (si los hay).
- El comportamiento general del bloque de código.

NO describas detalles de implementación técnica. Describe el propósito de negocio.

```yaml
# Mal (detalles de implementación):
INTENT: |
  Usa un patrón regex para hacer match de emails RFC 5322 y devuelve una tupla.

# Bien (propósito de negocio):
INTENT: |
  Valida una dirección de email según el estándar RFC 5322.
  Devuelve una bandera de validez y un mensaje explicando el resultado.
```

### Paso 3: Extraer las Reglas de BEHAVIOR (Comportamiento)

Analiza el flujo de control de la función (los `if`, `switch`, `try/catch`) y convierte CADA RAMA en una regla WHEN/THEN. Aunque el lenguaje de origen cambie, la salida en BEHAVIOR siempre es el mismo formato:

**Desde Python:**
```python
if not email:
    return (False, "El email no puede estar vacío")
```

**Desde Go:**
```go
if email == "" {
    return false, fmt.Errorf("El email no puede estar vacio")
}
```

**Desde Rust:**
```rust
if email.is_empty() {
    return Err("El email no puede estar vacio".to_string());
}
```

**Todos se extraen al mismo BEHAVIOR:**
```yaml
BEHAVIOR:
  - WHEN email está vacío THEN return error "El email no puede estar vacío"
```

Reglas para la extracción:
- Cada rama condicional que retorne (`return`) o lance un error (`raise`/`throw`) se convierte en un WHEN/THEN.
- El `return` final o el bloque `else` definitivo se convierte en el `OTHERWISE`.
- Preserva LOS MENSAJES DE ERROR EXACTOS literales del código original.
- Mantén el orden exacto de las comprobaciones (de arriba a abajo tal cual están en el código).
- Traduce los detalles de implementación a descripciones de negocio (ej. `if obj.status == 2` -> `WHEN pedido está enviado`).

### Paso 4: Extraer CONSTRAINTS (Restricciones)

Busca patrones de validación de entrada en el código:
- Comprobaciones de tipos (`isinstance`, `typeof`).
- Comprobaciones de rangos (`if x < 0`).
- Comprobaciones de formato (regex, parseos de fechas).
- Comprobaciones de longitud (`len()`, `.length`).

```yaml
CONSTRAINTS:
  - "precio: debe ser un número no negativo"
  - "porcentaje: número entero entre 0 y 100"
```

### Paso 5: Identificar EDGE_CASES (Casos Límite)

Busca:
- Valores límite manejados en condiciones (`>=`, `<`, `==`).
- Casos especiales (entradas vacías, None/null/undefined, ceros, divisiones).
- Cláusulas de guarda (Guard clauses) al principio de la función.

```yaml
EDGE_CASES:
  - "string vacío: devuelve error"
  - "porcentaje = 0: devuelve el precio original"
  - "porcentaje = 100: devuelve 0.0"
```

### Paso 6: Generar TESTS

Crea casos de prueba que cubran la realidad del código que acabas de leer:
1. **Camino feliz** — entradas normales que tienen éxito (2-3 tests).
2. **Límites (Boundary)** — valores en los bordes de las condiciones (2-3 tests).
3. **Casos de error** — entradas que activan cada rama de error (1 por cada error distinto).

```yaml
TESTS:
  # Camino feliz
  - "calcular_descuento(100.0, 20) == 80.0"
  - "calcular_descuento(50.0, 10) == 45.0"

  # Casos límite
  - "calcular_descuento(100.0, 0) == 100.0"
  - "calcular_descuento(100.0, 100) == 0.0"

  # Casos de error
  - "calcular_descuento(-10.0, 20) raises ValueError"
  - "calcular_descuento(100.0, -5) raises ValueError"
```

### Paso 7: Ensamblar y Validar

Combina todas las secciones en un contrato completo. Luego auto-valídate:
- ¿Todas las ramas del código fuente original están reflejadas en el BEHAVIOR?
- ¿Toda regla BEHAVIOR tiene un test asociado?
- ¿He copiado literalmente los mensajes de error del código viejo?

---

## Formato de Salida

Pregunta al usuario qué formato prefiere. Por defecto, usa el formato YAML.

Establece `meta.language` al lenguaje que hayas detectado en el código fuente.

**Formato YAML:**
```yaml
---
meta:
  name: nombre_de_funcion
  language: <lenguaje_detectado>
  version: 1.0
  tags: [inferred, from-code]
---

RUNE: nombre_de_funcion

SIGNATURE: |
  ...
INTENT: |
  ...
BEHAVIOR:
  - ...
TESTS:
  - ...
# ... resto de campos
```

---

## Reglas Estrictas para la IA

- **Extracción literal:** Extrae el comportamiento del código TAL Y COMO ESTÁ — **no intentes mejorar, arreglar o refactorizar la función durante este paso.**
- Si el código viejo tiene bugs obvios o cosas sin sentido, especifica ESE comportamiento real actual en el contrato y añade una nota para el usuario.
- Conserva los mensajes de error exactos del código fuente.
- Si los tipos no están anotados en el código, dedúcelos pero añade un comentario indicando que los has deducido.
- Siempre genera al menos 3 tests.
- Pide siempre al Director de Proyecto que verifique si el contrato extraído coincide con lo que él "quería" que hiciera el código original (a menudo el código viejo no refleja el requerimiento de negocio real).