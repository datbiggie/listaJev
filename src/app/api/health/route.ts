import { NextResponse } from "next/server";
import { getDbPool } from "@/lib/service-container";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const checkDb = searchParams.get("db") === "1";

  if (!checkDb) {
    return NextResponse.json(
      {
        status: "ok",
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString()
      },
      { status: 200 }
    );
  }

  try {
    const pool = getDbPool();
    await pool.query("SELECT 1");
    return NextResponse.json(
      {
        status: "ok",
        database: "connected",
        timestamp: new Date().toISOString()
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: "degraded",
        database: (error as Error).message,
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );
  }
}
