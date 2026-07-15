import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const status = searchParams.get("status") || "active";
  const pair = searchParams.get("pair");
  const limit = parseInt(searchParams.get("limit") || "20");

  const where: any = {};
  if (status !== "all") where.status = status;
  if (pair) where.pair = pair.replace("/", "");

  const signals = await db.signal.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({ signals });
}
