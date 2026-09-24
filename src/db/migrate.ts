import fs from "node:fs";
import path from "node:path";
import { Pool } from "pg";

/**
 * Carga opcional de variables desde archivo .env local si no estuvieran en el entorno.
 */
function initializeEnvironment(): void {
  if (typeof process.loadEnvFile === "function") {
    try {
      process.loadEnvFile();
    } catch {
      // Archivo .env ausente o ya cargado por el runtime
    }
  }
}

/**
 * Asegura la existencia de la base de datos de destino en la instancia PostgreSQL.
 */
async function ensureDatabaseExists(databaseUrl: string): Promise<void> {
  const parsed = new URL(databaseUrl);
  const targetDb = parsed.pathname.slice(1);

  if (!targetDb || targetDb === "postgres") {
    return;
  }

  // Conexión administrativa temporal a la base por defecto 'postgres'
  const adminUrl = new URL(databaseUrl);
  adminUrl.pathname = "/postgres";

  try {
    const adminPool = new Pool({
      connectionString: adminUrl.toString(),
      connectionTimeoutMillis: 5000
    });

    try {
      const checkQuery = "SELECT 1 FROM pg_database WHERE datname = $1;";
      const result = await adminPool.query(checkQuery, [targetDb]);

      if (result.rowCount === 0) {
        process.stdout.write(`Creando base de datos '${targetDb}'...\n`);
        // CREATE DATABASE no admite parámetros parametrizados para el identificador
        const safeDbName = targetDb.replace(/"/g, '""');
        await adminPool.query(`CREATE DATABASE "${safeDbName}";`);
        process.stdout.write(`Base de datos '${targetDb}' creada correctamente.\n`);
      }
    } finally {
      await adminPool.end();
    }
  } catch (error) {
    process.stdout.write(
      `Aviso: Verificacion administrativa de BD omitida (${(error as Error).message}). Continuando conexion directa a '${targetDb}'...\n`
    );
  }
}

function normalizeDatabaseUrl(connectionString: string): string {
  try {
    const parsed = new URL(connectionString);
    const sslmode = parsed.searchParams.get("sslmode");
    if (sslmode === "require" && !parsed.searchParams.has("uselibpqcompat")) {
      parsed.searchParams.set("sslmode", "verify-full");
      return parsed.toString();
    }
    return connectionString;
  } catch {
    return connectionString;
  }
}

/**
 * Ejecutor principal de migraciones transaccionales e idempotentes.
 */
export async function runMigrations(): Promise<void> {
  initializeEnvironment();

  const rawDatabaseUrl = process.env["DATABASE_URL"];
  if (!rawDatabaseUrl) {
    throw new Error(
      "La variable de entorno DATABASE_URL no esta configurada. Definala en su archivo .env o en el entorno."
    );
  }

  const databaseUrl = normalizeDatabaseUrl(rawDatabaseUrl);
  await ensureDatabaseExists(databaseUrl);

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    // 1. Crear tabla de control de migraciones si no existe
    const createMigrationsTable = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await pool.query(createMigrationsTable);

    // 2. Obtener lista de migraciones ya ejecutadas
    const appliedResult = await pool.query<{ name: string }>(
      "SELECT name FROM schema_migrations;"
    );
    const appliedSet = new Set(appliedResult.rows.map((r) => r.name));

    // 3. Buscar archivos de migración en la carpeta migrations/
    const migrationsDir = path.resolve(process.cwd(), "migrations");
    if (!fs.existsSync(migrationsDir)) {
      process.stdout.write("Directorio de migraciones no encontrado.\n");
      return;
    }

    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    const pendingMigrations = migrationFiles.filter((file) => !appliedSet.has(file));

    if (pendingMigrations.length === 0) {
      process.stdout.write("No hay migraciones pendientes. Base de datos al dia.\n");
      return;
    }

    process.stdout.write(
      `Se encontraron ${pendingMigrations.length} migracion(es) pendiente(s) por aplicar.\n`
    );

    // 4. Aplicar cada migración de forma atómica y dedicada
    for (const file of pendingMigrations) {
      const filePath = path.join(migrationsDir, file);
      const sqlContent = fs.readFileSync(filePath, "utf-8");

      const client = await pool.connect();
      try {
        await client.query("BEGIN;");
        await client.query(sqlContent);
        await client.query(
          "INSERT INTO schema_migrations (name) VALUES ($1);",
          [file]
        );
        await client.query("COMMIT;");
        process.stdout.write(`Migracion aplicada con exito: ${file}\n`);
      } catch (error) {
        await client.query("ROLLBACK;");
        throw new Error(
          `Fallo al ejecutar la migracion '${file}': ${(error as Error).message}`
        );
      } finally {
        client.release();
      }
    }

    process.stdout.write("Todas las migraciones se completaron satisfactoriamente.\n");
  } finally {
    await pool.end();
  }
}

if (process.env["NODE_ENV"] !== "test") {
  runMigrations().catch((error) => {
    process.stderr.write(`Error durante la ejecucion de migraciones: ${error.message}\n`);
    process.exit(1);
  });
}
