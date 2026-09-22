# Especificación Técnica: Función Pura de Normalización de SKUs y Sanitización

**Identificador:** `SPEC-NORM-002`  
**Archivo de Destino:** `specs/02-sku-normalizer.spec.md`  
**Módulos Relacionados:** `src/sku-normalizer.ts`, `src/types.ts`  
**Requerimientos SRS:** `RF-01`  
**Estado:** `Aprobado`  

---

## 1. Propósito y Alcance

Esta especificación define la lógica funcional pura para la normalización de identificadores de inventario (SKUs) y la sanitización de nombres comerciales de productos. 

El objetivo es eliminar variaciones sintácticas espurias (guiones, barras, espacios múltiples, diferencias entre mayúsculas y minúsculas y caracteres de control) para permitir:
1. Coincidencias exactas deterministas preliminares en tiempo $O(1)$ antes de activar filtros difusos o inferencias por IA.
2. Indexación B-Tree homogénea sobre las columnas `normalized_sku` de `client_products` y `supplier_products`.

---

## 2. Definición de Contratos y Firmas

El módulo `src/sku-normalizer.ts` debe exponer funciones puras sin efectos secundarios ni dependencias externas:

```typescript
/**
 * Sanitiza y normaliza un SKU removiendo todo caracter que no sea alfanumérico
 * y transformando el resultado a mayúsculas.
 *
 * @param rawSku - Código SKU original provisto en la ingesta.
 * @returns Cadena normalizada alfanumérica en mayúsculas sin espacios ni símbolos.
 */
export function normalizeSku(rawSku: string): string;

/**
 * Sanitiza el nombre comercial del producto normalizando espacios en blanco
 * continuos y eliminando espacios al inicio y al final.
 *
 * @param rawName - Nombre o descripción bruta del producto.
 * @returns Cadena con espacios unificados sin alterar la capitalización ni caracteres especiales del nombre.
 */
export function sanitizeProductName(rawName: string): string;
```

---

## 3. Matriz de Entradas Sucias y Salidas Esperadas

### 3.1 Normalización de SKUs (`normalizeSku`)

| ID Caso | Entrada Bruta (`rawSku`) | Salida Normalizada Esperada | Razón de Transformación |
| :--- | :--- | :--- | :--- |
| **TC-SKU-01** | `"PROD-12345"` | `"PROD12345"` | Eliminación de guion medio. |
| **TC-SKU-02** | `"  prod 12345  "` | `"PROD12345"` | Trim, remoción de espacios intermedios y conversión a mayúsculas. |
| **TC-SKU-03** | `"sku_abc-789/x"` | `"SKUABC789X"` | Remoción de guion bajo, barra y guion. |
| **TC-SKU-04** | `"999.001.002-A"` | `"999001002A"` | Remoción de puntos y guion. |
| **TC-SKU-05** | `"SKU#@!$%123"` | `"SKU123"` | Eliminación de caracteres especiales no alfanuméricos. |
| **TC-SKU-06** | `""` | `""` | Manejo seguro de cadena vacía. |
| **TC-SKU-07** | `"   "` | `""` | Manejo seguro de cadena de espacios en blanco. |
| **TC-SKU-08** | `"A1B2C3"` | `"A1B2C3"` | Conservación idempotente de SKU ya normalizado. |

### 3.2 Sanitización de Nombres (`sanitizeProductName`)

| ID Caso | Entrada Bruta (`rawName`) | Salida Sanitizada Esperada | Razón de Transformación |
| :--- | :--- | :--- | :--- |
| **TC-NAME-01** | `"  Tornillo   Hexagonal   1/2\"  "` | `"Tornillo Hexagonal 1/2\""` | Reducción de espacios consecutivos a uno solo y trim de extremos. |
| **TC-NAME-02** | `"Tuerca\tM10\nZincada"` | `"Tuerca M10 Zincada"` | Normalización de tabuladores y saltos de línea a espacios simples. |
| **TC-NAME-03** | `"Arandela de Presión 3/8"` | `"Arandela de Presión 3/8"` | Preservación de acentos, caracteres en minúscula/mayúscula y barras. |
| **TC-NAME-04** | `"   "` | `""` | Colapso a cadena vacía para nombres en blanco. |

---

## 4. Invariantes y Reglas de Calidad

1. **Pureza e Idempotencia:**
   - Para cualquier cadena $s$: $\text{normalizeSku}(\text{normalizeSku}(s)) = \text{normalizeSku}(s)$.
   - Ninguna función muta parámetros ni realiza operaciones asíncronas ni de I/O.
2. **Determinismo:**
   - La misma entrada produce indefectiblemente la misma salida en cualquier entorno (Node.js, Bun o navegador).
3. **Resiliencia ante Valores Nulos:**
   - La función debe validar que el argumento sea una cadena de texto; de recibir tipos inesperados o no definidos en tiempo de ejecución, debe lanzar un error explícito de tipo (`TypeError`).

---

## 5. Criterios de Aceptación (BDD / Given-When-Then)

### Escenario 1: Normalización de SKUs con caracteres mixtos
- **Given** un SKU en bruto `"  sku-hex_050/A  "`.
- **When** se invoca `normalizeSku("  sku-hex_050/A  ")`.
- **Then** el valor devuelto es `"SKUHEX050A"`.

### Escenario 2: Idempotencia en SKUs previamente limpios
- **Given** un SKU limpio `"SKU100"`.
- **When** se evalúa `normalizeSku("SKU100")`.
- **Then** el valor retornado es estrictamente idéntico a `"SKU100"`.

### Escenario 3: Sanitización de espacios y saltos de línea en nombres
- **Given** un nombre de producto con formato irregular `"  Tornillo \t Hexagonal \n 1/2 in  "`.
- **When** se invoca `sanitizeProductName("  Tornillo \t Hexagonal \n 1/2 in  ")`.
- **Then** el resultado es `"Tornillo Hexagonal 1/2 in"`.
