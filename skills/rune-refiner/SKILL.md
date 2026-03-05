---
name: rune-refiner
description: Analiza especificaciones RUNE y sugiere mejoras. Úsalo cuando un contrato es estructuralmente válido pero puede tener tests faltantes, casos límite sin cubrir, reglas de comportamiento ambiguas o restricciones incompletas.
license: MIT
---

## Cómo usarlo

Cuando se te entregue un contrato RUNE que sea estructuralmente válido pero pueda estar incompleto o ser débil, analízalo y sugiere mejoras proporcionando el contenido exacto listo para copiar y pegar.

Entrada: un archivo YAML `.rune` o una sección Markdown de un contrato.
Salida: una lista de sugerencias de mejora con el contenido propuesto.

---

## Áreas de Análisis

### 1. Brechas en la Cobertura de Tests

Comprueba si la sección TESTS cubre adecuadamente las reglas de BEHAVIOR.

**Busca:**
- Reglas BEHAVIOR con solo 1 test (deberían tener 2+)
- Tests de límite (boundary) faltantes para rangos numéricos
- Tests faltantes para entradas vacías/nulas
- Tests faltantes para la cláusula OTHERWISE
- Tests de "camino feliz" que solo cubren un escenario

**Ejemplo de sugerencia:**
```markdown
**Brecha:** La regla BEHAVIOR "WHEN porcentaje > 100 THEN raise error" solo tiene 1 test con el valor 101.
**Sugerencia:** Añade un test con un valor más extremo:
  - `"calcular_descuento(100.0, 150) raises ValueError"`
```

### 2. Descubrimiento de Casos Límite (Edge Cases)

Identifica casos límite que al autor del contrato se le hayan podido pasar por alto.

**Casos límite comunes por tipo de entrada:**

| Tipo | Casos límite a comprobar |
|------|-------------------|
| string | vacío `""`, solo espacios en blanco, muy largo (>1000 chars), unicode, null/nil/None |
| integer | 0, negativo, valor máximo del lenguaje, null/nil/None |
| decimal/float | 0.0, negativo, muy pequeño (0.001), muy grande, NaN, Infinito, null/nil/None |
| list/array | vacío, un solo elemento, elementos duplicados, null/nil/None |
| map/object | vacío, claves faltantes, claves extra, null/nil/None |
| boolean | tanto true como false |
| date/time | hoy, pasado, futuro lejano, medianoche, límites de zonas horarias |

**Ejemplo de sugerencia:**
```markdown
**Brecha:** No hay caso límite para entradas que solo contienen espacios.
**Sugerencia:** Añade a EDGE_CASES:
  - `"email solo con espacios ('   '): devuelve (False, 'El email no puede estar vacío')"`
Y añade a TESTS:
  - `"validar_email('   ')[0] == False"`
```

### 3. Ambigüedad en BEHAVIOR

Identifica reglas de comportamiento que sean vagas o abiertas a múltiples interpretaciones.

**Señales de alerta:**
- Reglas sin mensajes de error específicos: `THEN raise error`
- Reglas con condiciones vagas: `WHEN entrada es inválida`
- Reglas que usan "etc." o "y demás"
- Falta la cláusula OTHERWISE (comportamiento por defecto)
- Condiciones que podrían solaparse (múltiples reglas coinciden con la misma entrada)

**Ejemplo de sugerencia:**
```markdown
**Ambigüedad:** "WHEN entrada es inválida THEN raise error" — ¿qué hace que sea inválida? ¿Qué error?
**Sugerencia:** Reemplázalo con reglas específicas:
  - `WHEN entrada está vacía THEN raise error "La entrada no puede estar vacía"`
  - `WHEN entrada contiene caracteres no-ASCII THEN raise error "La entrada debe ser ASCII"`
```

### 4. Completitud de CONSTRAINTS

Comprueba si los CONSTRAINTS (Restricciones) describen completamente el espacio de entradas válidas.

**Busca:**
- Parámetros sin ninguna restricción
- Restricciones vagas ("debe ser válido")
- Falta de información de rangos para parámetros numéricos
- Falta de información de formato para strings (ej. regex esperada)
- Límites de tamaño faltantes para listas o arrays

**Ejemplo de sugerencia:**
```markdown
**Brecha:** El parámetro `timeout` no tiene restricción.
**Sugerencia:** Añade a CONSTRAINTS:
  - `"timeout: entero entre 1 y 300 (segundos)"`
```

### 5. Claridad del INTENT

Comprueba si el INTENT (Intención) comunica claramente el propósito de negocio.

**Problemas a señalar:**
- Detalles de implementación (mencionar regex, nombres de algoritmos, librerías concretas)
- Demasiado vago ("procesa los datos")
- Falta descripción de lo que devuelve la función
- Tiene más de 3 frases (demasiado largo)

### 6. Consistencia del Contrato

Comprueba la consistencia interna entre las diferentes secciones.

**Busca:**
- EDGE_CASES que no están reflejados en ninguna regla de BEHAVIOR
- CONSTRAINTS que implican un comportamiento que no existe en BEHAVIOR
- EXAMPLES que muestran un comportamiento no definido en BEHAVIOR
- COMPLEXITY que no cuadra con el algoritmo aparente

---

## Formato de Salida

```markdown
## Informe de Refinamiento RUNE: `<nombre_de_la_funcion>`

### Cobertura de Tests
1. **[AÑADIR TEST]** La regla BEHAVIOR "WHEN porcentaje > 100..." tiene 1 test. Añadir:
   - `"calcular_descuento(100.0, 200) raises ValueError"`

2. **[AÑADIR TEST]** La cláusula OTHERWISE no tiene un test dedicado. Añadir:
   - `"calcular_descuento(100.0, 20) == 80.0"` (si no existe ya)

### Casos Límite (Edge Cases)
3. **[AÑADIR EDGE_CASE]** No hay test para precio cero:
   - Caso límite: `"precio = 0.0: devuelve 0.0 sin importar el porcentaje"`
   - Test: `"calcular_descuento(0.0, 50) == 0.0"`

### Ambigüedad
4. **[ACLARAR]** La regla BEHAVIOR "WHEN cupón ha caducado" — ¿caducado significa `caduca_en < fecha_actual` o `caduca_en <= fecha_actual`? Añadir a EDGE_CASES:
   - `"caduca hoy: sigue siendo válido (caduca_en == fecha_actual)"`

### Restricciones
5. **[AÑADIR CONSTRAINT]** El parámetro `fecha` no tiene restricción de formato. Añadir:
   - `"fecha: string en formato ISO 8601 (YYYY-MM-DD)"`

### Resumen
- **Sugerencias:** 5 en total (2 tests, 1 caso límite, 1 aclaración, 1 restricción)
- **Mejora estimada:** El contrato pasa de cubrir ~70% de las entradas realistas a un ~95%
```

---

## Reglas de Comportamiento de la IA

- Solo sugiere mejoras, NUNCA modifiques el contrato directamente tú misma.
- Cada sugerencia debe incluir el contenido exacto listo para que el usuario lo copie y pegue (YAML o Markdown).
- Prioriza sugerencias que prevengan bugs reales por encima de mejoras de estilo.
- No sugieras cambios que contradigan reglas BEHAVIOR ya existentes aprobadas por el usuario.
- Si el contrato ya es muy robusto, dilo claramente — no inventes sugerencias innecesarias solo por rellenar.
- Céntrate en encontrar "agujeros" lógicos que harían que dos programadores distintos programaran cosas diferentes leyendo el mismo contrato.