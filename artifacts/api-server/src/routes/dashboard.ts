import { Router, type IRouter } from "express";
import { db, productsTable, categoriesTable, movementsTable } from "@workspace/db";
import { eq, gte, desc, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/dashboard", async (_req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [productCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(productsTable);

  const [categoryCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(categoriesTable);

  const allProducts = await db.select().from(productsTable);
  const lowStockProducts = allProducts.filter((p) => {
    const current = parseFloat(p.currentStock as unknown as string);
    const min = parseFloat(p.minimumStock as unknown as string);
    return current <= min;
  });

  const todayMovements = await db
    .select({
      type: movementsTable.type,
      count: sql<number>`count(*)::int`,
    })
    .from(movementsTable)
    .where(gte(movementsTable.createdAt, today))
    .groupBy(movementsTable.type);

  const entradasHoy = todayMovements.find((m) => m.type === "entrada")?.count ?? 0;
  const salidasHoy = todayMovements.find((m) => m.type === "salida")?.count ?? 0;

  const recentRows = await db
    .select({
      id: movementsTable.id,
      productId: movementsTable.productId,
      productName: productsTable.name,
      categoryName: categoriesTable.name,
      type: movementsTable.type,
      quantity: movementsTable.quantity,
      notes: movementsTable.notes,
      stockBefore: movementsTable.stockBefore,
      stockAfter: movementsTable.stockAfter,
      createdAt: movementsTable.createdAt,
    })
    .from(movementsTable)
    .leftJoin(productsTable, eq(movementsTable.productId, productsTable.id))
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .orderBy(desc(movementsTable.createdAt))
    .limit(10);

  const recentMovements = recentRows.map((r) => ({
    ...r,
    productName: r.productName ?? "",
    categoryName: r.categoryName ?? "",
    quantity: parseFloat(r.quantity as unknown as string),
    stockBefore: parseFloat(r.stockBefore as unknown as string),
    stockAfter: parseFloat(r.stockAfter as unknown as string),
  }));

  res.json({
    totalProducts: productCount?.count ?? 0,
    totalCategories: categoryCount?.count ?? 0,
    lowStockProducts: lowStockProducts.length,
    recentMovements,
    totalEntradasHoy: entradasHoy,
    totalSalidasHoy: salidasHoy,
  });
});

export default router;
