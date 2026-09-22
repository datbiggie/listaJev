# Sistema de Conciliacion de Catalogos y Sincronizacion de Stock

Sistema empresarial de reconciliacion de catalogos y sincronizacion de existencias en tiempo real, desarrollado con Clean Architecture, Spec-Driven Development (SDD), TypeScript estricto, Next.js App Router y PostgreSQL 15+.

---

## Indice de Contenidos

1. [Descripcion General](#1-descripcion-general)
2. [Guia de Uso Paso a Paso de la Plataforma Web](#2-guia-de-uso-paso-a-paso-de-la-plataforma-web)
   - [2.1 Flujo Operativo y Conceptos Clave](#21-flujo-operativo-y-conceptos-clave)
   - [2.2 Paso 1: Ingesta del Catalogo Base de Clientes](#22-paso-1-ingesta-del-catalogo-base-de-clientes)
   - [2.3 Paso 2: Ingesta de la Lista de Existencias del Proveedor](#23-paso-2-ingesta-de-la-lista-de-existencias-del-proveedor)
   - [2.4 Paso 3: Ejecucion de la Conciliacion Semantica](#24-paso-3-ejecucion-de-la-conciliacion-semantica)
   - [2.5 Paso 4: Auditoria y Resolucion Manual de Discrepancias](#25-paso-4-auditoria-y-resolucion-manual-de-discrepancias)
   - [2.6 Paso 5: Consulta y Exportacion de Inventario en Tiempo Real](#26-paso-5-consulta-y-exportacion-de-inventario-en-tiempo-real)
3. [Formatos de PDF Compatibles](#3-formatos-de-pdf-compatibles)
4. [Requisitos Previos](#4-requisitos-previos)
5. [Instalacion y Configuracion](#5-instalacion-y-configuracion)
6. [Inicializacion de la Base de Datos](#6-inicializacion-de-la-base-de-datos)
7. [Comandos de Ejecucion](#7-comandos-de-ejecucion)
8. [Pruebas y Control de Calidad](#8-pruebas-y-control-de-calidad)
9. [Arquitectura y Estructura del Codigo](#9-arquitectura-y-estructura-del-codigo)

---

## 1. Descripcion General

El sistema automatiza el emparejamiento semantico entre catalogos heterogeneos de clientes y proveedores mediante un pipeline de dos fases:

1. **Fase 1 - Resolucion Semantica de Identidad:**
   - Normalizacion lexica y purificacion de SKUs (`normalizeSku`, `sanitizeProductName`).
   - Bloqueo y reduccion de candidatos mediante trigramas relacionales (`pg_trgm`) en PostgreSQL con umbrales configurables.
   - Evaluacion semantica determinista con modelos LLM a traves de Vercel AI Gateway.
   - Clasificacion automatica segun umbrales matematicos:
     - `CONFIRMED`: Certeza mayor o igual a 0.90 (emparejamiento directo).
     - `REQUIRES_REVIEW`: Certeza entre 0.70 y 0.89 (bandeja de auditoria manual).
     - `REJECTED`: Certeza menor a 0.70 o ausencia de candidatos compatibles.
   - Garantia de idempotencia mediante indices unicos parciales.

2. **Fase 2 - Cruce Determinista de Stock en Tiempo Real:**
   - Evaluacion instantanea mediante consultas relacionales indexadas con latencia sub-200 ms.
   - Determinacion de estados: `DISPONIBLE`, `AGOTADO`, `DESCATALOGADO_PROVEEDOR` y `NO_CATALOGADO`.

---

## 2. Guia de Uso Paso a Paso de la Plataforma Web

### 2.1 Flujo Operativo y Conceptos Clave

El proceso de conciliacion de inventario requiere dos fuentes de informacion complementarias:

| Tipo de Catalogo | Destino en BD | Proposito | Campos Extraidos |
| :--- | :--- | :--- | :--- |
| **Catálogo Base Cliente (CLIENT)** | `client_products` | Maestro de productos de la empresa. Es la lista de referencia contra la que se coteja la existencia. | SKU y Descripcion |
| **Lista Proveedor con Stock (SUPPLIER)** | `supplier_products` | Catalogo comercial o lista de precios enviada por el mayorista/proveedor con stock disponible. | SKU, Descripcion y Cantidad en Stock |

El flujo operativo recomendado es secuencial:
1. Ingestar primero el Catalogo Base del Cliente.
2. Ingestar la Lista de Existencias del Proveedor.
3. Ejecutar la Conciliacion.
4. Auditar las coincidencias dudosas.
5. Visualizar el estado consolidado de inventario.

---

### 2.2 Paso 1: Ingesta del Catalogo Base de Clientes

1. Abra su navegador web e ingrese a:
   `http://localhost:3000/dashboard/ingest`
2. En la seccion **"Paso 1: Seleccione el Tipo de Catálogo a Cargar"**, haga clic en la tarjeta **"Catálogo Base de Clientes (Opción A)"**.
   - El distintivo cambiara a "Seleccionado" con borde azul resaltado.
   - La tabla de destino indicada sera `client_products`.
3. En la seccion **"Paso 2: Adjunte el Documento PDF"**:
   - Arrastre el archivo PDF de su catalogo de clientes a la zona punteada, o haga clic sobre ella para examinar sus archivos locales.
   - Verifique que aparezca la confirmacion con el nombre del archivo y su tamano en megabytes.
4. Presione el boton **"Procesar Catálogo Base de Clientes"**.
5. Al finalizar el procesamiento, se desplegara la tarjeta **Resultado de la Ingesta de Catálogo**:
   - **Páginas Leídas:** Total de paginas procesadas en el documento.
   - **Productos Detectados:** Registros sintacticamente validos reconocidos por el parser.
   - **Persistidos en BD:** Cantidad de productos guardados o actualizados exitosamente en `client_products`.
   - **Líneas Descartadas:** Encabezados de pagina, fechas o lineas no tabulares ignoradas.
6. Presione el boton **"Continuar: Cargar Lista de Proveedor con Stock"** para avanzar al siguiente paso.

---

### 2.3 Paso 2: Ingesta de la Lista de Existencias del Proveedor

1. En el **Centro de Ingesta (`/dashboard/ingest`)**, asegurese de tener activa la tarjeta **"Lista Proveedor con Existencias (Opción B)"**.
   - La tabla de destino indicada sera `supplier_products`.
2. En el area de carga de archivos:
   - Arrastre o seleccione el archivo PDF comercial entregado por el proveedor (por ejemplo, listas de precios con existencia y montos en divisa).
3. Presione el boton **"Procesar Lista de Existencias de Proveedor"**.
4. El extractor analizara linea por linea extrayendo el SKU del proveedor, la descripcion del articulo y la existencia numerica en stock.
5. El resumen confirmara la insercion masiva idempotente (`ON CONFLICT DO UPDATE`) en la tabla `supplier_products`.
6. Presione el enlace **"Ir a Bandeja de Auditoría y Ejecutar Conciliación"**.

---

### 2.4 Paso 3: Ejecucion de la Conciliacion Semantica

1. Acceda a la **Bandeja de Auditoria (`/dashboard/audit`)** desde el menu de navegacion lateral.
2. Haga clic en el boton superior **"Ejecutar Ciclo de Conciliacion"**.
   - El sistema tomara todos los productos pendientes en `client_products` que no cuenten con mapeo previo.
   - Ejecutara una busqueda de candidatos usando trigramas (`pg_trgm`) contra `supplier_products`.
   - Evaluara los pares coincidentes utilizando el modelo de inteligencia artificial configurado.
3. Al terminar la ejecucion:
   - Las coincidencias con certeza de al menos 90% (`CONFIRMED`) quedaran aprobadas directamente y enlazaran el stock en tiempo real.
   - Las coincidencias con certeza entre 70% y 89% (`REQUIRES_REVIEW`) apareceran listadas en la tabla de la bandeja de auditoria para supervision humana.

---

### 2.5 Paso 4: Auditoria y Resolucion Manual de Discrepancias

1. En la **Bandeja de Auditoria (`/dashboard/audit`)**, revise cada fila con discrepancia semantica:
   - **Producto Cliente:** Muestra el SKU y nombre segun el catalogo de clientes.
   - **Candidato Proveedor:** Muestra el SKU y nombre coincidente encontrado en el proveedor.
   - **Certeza Semantica:** Porcentaje de similitud calculado por el modelo (por ejemplo, 85%).
   - **Motivo de Revision:** Explicacion detallada del factor de discrepancia (por ejemplo, diferencias en amperaje, marca o tipo de conector).
2. Para resolver cada caso:
   - Presione **"Confirmar"**: Establece la equivalencia como valida (`CONFIRMED`). Las existencias del proveedor se asignaran al producto del cliente de inmediato.
   - Presione **"Rechazar"**: Descarta la sugerencia (`REJECTED`) y conserva el registro de auditoria para no volver a sugerir el par incompatible.
3. La interfaz aplica mutaciones optimistas para remover al instante las filas resueltas sin recargar la pagina.

---

### 2.6 Paso 5: Consulta y Exportacion de Inventario en Tiempo Real

1. Acceda al **Tablero de Stock (`/dashboard/stock`)** desde el menu lateral.
2. Observe los indicadores consolidados de inventario:
   - **Total Catalogo:** Total de articulos registrados en el catalogo del cliente.
   - **Disponibles:** Articulos mapeados que cuentan con stock positivo en el proveedor ($> 0$).
   - **Agotados:** Articulos mapeados pero con stock en cero ($= 0$).
   - **Descatalogados Proveedor:** Articulos mapeados en el pasado que no vinieron en la ultima lista del proveedor.
   - **No Catalogados:** Articulos del cliente que aun no tienen un mapeo confirmado con ningun proveedor.
3. Utilice las herramientas interactivas:
   - **Filtros por Estado:** Pildoras interactivas para visualizar unicamente productos `DISPONIBLE`, `AGOTADO`, `DESCATALOGADO_PROVEEDOR` o `NO_CATALOGADO`.
   - **Buscador de Texto:** Filtre por codigo SKU o por coincidencia en la descripcion del articulo.
   - **Paginador:** Navegue por lotes de 50 registros por pagina.
   - **Boton Exportar CSV:** Genera y descarga de forma inmediata un archivo `.csv` con todas las columnas del inventario conciliado.

---

## 3. Formatos de PDF Compatibles

El modulo de extraccion adaptativo (`UnpdfExtractor`) procesa documentos en memoria sin requerir herramientas externas de OCR, admitiendo dos patrones principales:

1. **Patron Tabular Estandar:**
   Lineas delimitadas por tabuladores (`\t`), barras verticales (`|`), punto y coma (`;`) o dos o mas espacios continuos:
   ```plaintext
   PROD-001    Tornillo Hexagonal 1/2    50
   SUP-999 | Arandela de Presion 3/8 | 120
   ITEM-123; Clavo de Acero 2 in
   ```

2. **Patron de Lista de Precios y Catalogos Comerciales:**
   Lineas tabulares de alta densidad con SKUs alfanumericos, descripcion, stock entero y montos en divisa (`Bs.`, `$`, `USD`, `EUR`, `€`):
   ```plaintext
   8483N-3P-ENELB ALTERNADOR AVEO 1.6L 04-08 12V 85A 3PINE ENELBROCK 25 Bs.107.381,78 $127.50
   66-101 AUTOMATICO ARRANQUE CHEVROLET C10 ENELBROCK 281 Bs.12.350,00 $15.20
   ```

3. **Filtrado Automatico de Ruido:**
   El extractor descarta de forma autonoma lineas que contengan encabezados recurrentes (`Página X de Y`, `Fecha:`, `Lista de Precios`, etc.), separadores punteados o lineas sin formato estructurado.

---

## 4. Requisitos Previos

- **Node.js:** Version 20.0.0 o superior.
- **npm:** Version 10.0.0 o superior.
- **PostgreSQL:** Version 15 o superior con soporte de extension `pg_trgm`.
- **Vercel AI Gateway:** Llave de API valida con soporte para inferencia LLM.

---

## 5. Instalacion y Configuracion

### 5.1 Instalacion de Dependencias

```bash
npm install
```

### 5.2 Variables de Entorno

Copie el archivo `.env.example` a `.env` en la raiz del proyecto:

```bash
cp .env.example .env
```

Parametros de configuracion obligatorios:

```env
DATABASE_URL="postgresql://usuario:password@localhost:5432/catalogo_db"
AI_GATEWAY_API_KEY="tu_api_key_aqui"
JEV_MODEL_ID="typesafe-ai/jev"
BATCH_SIZE=50
MAX_CONCURRENCY=5
PG_TRGM_THRESHOLD=0.60
CONFIRMED_MATCH_THRESHOLD=0.90
REVIEW_MATCH_THRESHOLD=0.70
NODE_ENV="development"
```

---

## 6. Inicializacion de la Base de Datos

El proyecto cuenta con un sistema de migraciones automatizado en TypeScript con control de versiones en la tabla `schema_migrations`:

```bash
npm run db:migrate
```

El script creara automaticamente la base de datos si no existe, activara la extension `pg_trgm` y desplegara las tablas relacionales:
- `client_products`
- `supplier_products`
- `product_mappings`
- Indices GIN por trigramas (`idx_client_name_trgm`, `idx_supplier_name_trgm`)
- Indices unicos de idempotencia (`uq_client_supplier_pair`, `uq_client_rejected_orphan`)

---

## 7. Comandos de Ejecucion

### Iniciar Servidor de Desarrollo (Next.js)

```bash
npm run dev
```

El panel web estara disponible en:
- `http://localhost:3000` (Redirige de forma automatica a `/dashboard/ingest`)

### Iniciar Worker de Reconciliacion por Consola (CLI)

Para ejecutar una pasada completa de reconciliacion en segundo plano sin usar el navegador:

```bash
npm run worker
```

### Compilar y Ejecutar en Produccion

```bash
npm run build
npm start
```

---

## 8. Pruebas y Control de Calidad

### Verificacion Estricta de Tipos

```bash
npm run typecheck
```

### Ejecucion de la Suite de Pruebas Unitarias

```bash
npm test
```

### Reporte de Cobertura de Codigo

```bash
npm run test:coverage
```

Estado actual de aseguramiento de calidad:
- **84 pruebas unitarias superadas** en 11 archivos de especificacion.
- **0 errores de tipado TypeScript** (`tsc --noEmit`).
- **98%+ de cobertura de codigo**.

---

## 9. Arquitectura y Estructura del Codigo

```plaintext
├── migrations/
│   └── 001_initial_schema.sql         # Definicion de DDL inicial relacional
├── specs/                             # Especificaciones tecnicas formales (SDD)
│   ├── 01-domain-and-database.spec.md
│   ├── 02-sku-normalizer.spec.md
│   ├── 03-configuration.spec.md
│   ├── 04-product-repository.spec.md
│   ├── 05-jev-matcher-service.spec.md
│   ├── 06-reconciliation-worker.spec.md
│   ├── 07-stock-reconciliation-service.spec.md
│   ├── 08-concurrency-control.spec.md
│   ├── 09-end-to-end-integration.spec.md
│   ├── 10-catalog-ingestion-pdf.spec.md
│   └── 11-nextjs-actions-and-dashboard.spec.md
├── src/
│   ├── types.ts                       # Contratos de dominio y esquemas Zod (SSOT)
│   ├── config.ts                      # Validacion Fail-Fast de entorno
│   ├── sku-normalizer.ts              # Normalizacion pura de SKUs y nombres
│   ├── concurrency.ts                 # Control de concurrencia acotada (p-limit)
│   ├── product.repository.ts          # Repositorio transaccional PostgreSQL
│   ├── jev-matcher.service.ts         # Adaptador de inferencia IA (AI Gateway)
│   ├── reconciliation.worker.ts       # Orquestador del pipeline de reconciliacion
│   ├── stock-reconciliation.service.ts# Consultas deterministas de stock
│   ├── index.ts                       # Entrypoint del worker por consola
│   ├── db/
│   │   └── migrate.ts                 # Runner de migraciones automatizadas
│   ├── lib/
│   │   └── service-container.ts       # Inyeccion de dependencias desacoplada
│   ├── ingestion/
│   │   ├── unpdf-extractor.ts         # Parser adaptativo de PDF en memoria
│   │   └── catalog-ingestion.service.ts # Orquestador de ingesta masiva transaccional
│   ├── actions/                       # Next.js Server Actions
│   │   ├── ingest-catalog.action.ts
│   │   ├── run-reconciliation.action.ts
│   │   ├── resolve-review.action.ts
│   │   └── get-stock-report.action.ts
│   └── app/                           # Next.js App Router (RSC y Client Components)
│       ├── page.tsx                   # Redireccion de raiz a /dashboard/ingest
│       ├── globals.css                # Directivas de Tailwind CSS
│       ├── layout.tsx
│       └── dashboard/
│           ├── layout.tsx             # Menu lateral y contenedor de dashboard
│           ├── ingest/page.tsx        # Carga interactiva con seleccion de rol
│           ├── audit/page.tsx & audit-table.client.tsx
│           └── stock/page.tsx & stock-table.client.tsx
└── tests/
    └── unit/                          # 11 suites de pruebas unitarias
```
#   l i s t a J e v 
 