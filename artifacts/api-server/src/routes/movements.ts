import { Router, type IRouter } from "express";
import { db, movementsTable, productsTable, categoriesTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import {
  CreateMovementBody,
  ListMovementsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/movements", async (req, res) => {
  const query = ListMovementsQueryParams.parse(req.query);

  const conditions = [];
  if (query.productId) conditions.push(eq(movementsTable.productId, query.productId));
  if (query.type) conditions.push(eq(movementsTable.type, query.type));

  const rows = await db
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
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(movementsTable.createdAt))
    .limit(query.limit ?? 200);

  const movements = rows.map((r) => ({
    ...r,
    productName: r.productName ?? "",
    categoryName: r.categoryName ?? "",
    quantity: parseFloat(r.quantity as unknown as string),
    stockBefore: parseFloat(r.stockBefore as unknown as string),
    stockAfter: parseFloat(r.stockAfter as unknown as string),
  }));

  res.json(movements);
});

router.post("/movements", async (req, res) => {
  const body = CreateMovementBody.parse(req.body);

  const [product] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, body.productId));

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  const currentStock = parseFloat(product.currentStock as unknown as string);
  const quantity = body.quantity;

  if (body.type === "salida" && currentStock < quantity) {
    res.status(400).json({ error: "Stock insuficiente para realizar la salida" });
    return;
  }

  const stockAfter = body.type === "entrada"
    ? currentStock + quantity
    : currentStock - quantity;

  const [movement] = await db.transaction(async (tx) => {
    const [mov] = await tx.insert(movementsTable).values({
      productId: body.productId,
      type: body.type,
      quantity: String(quantity),
      notes: body.notes ?? null,
      stockBefore: String(currentStock),
      stockAfter: String(stockAfter),
    }).returning();

    await tx
      .update(productsTable)
      .set({ currentStock: String(stockAfter) })
      .where(eq(productsTable.id, body.productId));

    return [mov];
  });

  const [cat] = await db
    .select()
    .from(categoriesTable)
    .where(eq(categoriesTable.id, product.categoryId));

  res.status(201).json({
    ...movement,
    productName: product.name,
    categoryName: cat?.name ?? "",
    quantity: parseFloat(movement.quantity as unknown as string),
    stockBefore: parseFloat(movement.stockBefore as unknown as string),
    stockAfter: parseFloat(movement.stockAfter as unknown as string),
  });
});

export default router;
