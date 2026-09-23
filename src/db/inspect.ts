import { Pool } from "pg";

if (typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile();
  } catch {}
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  try {
    const r1 = await pool.query(
      "SELECT id, sku, normalized_sku, name, current_stock FROM supplier_products WHERE sku IN ('10', '15', '20', '25', '30', '35', '10 MIN', '15 MIN', '20 MIN', '25 MIN', '30 MIN', '35 MIN', '15MIN-ENELB') OR name ILIKE '%FUSIBLE MODERNO MINI%';"
    );
    console.log("SUPPLIER PRODUCTS:");
    console.log(JSON.stringify(r1.rows, null, 2));

    const r2 = await pool.query(
      "SELECT id, sku, normalized_sku, name FROM client_products WHERE sku IN ('10', '15', '20', '25', '30', '35', '10 MIN', '15 MIN', '20 MIN', '25 MIN', '30 MIN', '35 MIN', '15MIN-ENELB') OR name ILIKE '%FUSIBLE MODERNO MINI%';"
    );
    console.log("CLIENT PRODUCTS:");
    console.log(JSON.stringify(r2.rows, null, 2));

    const r3 = await pool.query(
      "SELECT id, client_sku, supplier_sku, status FROM product_mappings WHERE client_sku IN ('10', '15', '20', '25', '30', '35', '10 MIN', '15 MIN', '20 MIN', '25 MIN', '30 MIN', '35 MIN') OR supplier_sku IN ('10', '15', '20', '25', '30', '35', '10 MIN', '15 MIN', '20 MIN', '25 MIN', '30 MIN', '35 MIN');"
    );
    console.log("MAPPINGS:");
    console.log(JSON.stringify(r3.rows, null, 2));
  } catch (err) {
    console.error("DB Error:", err);
  } finally {
    await pool.end();
  }
}

check();
