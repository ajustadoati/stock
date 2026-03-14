import { Router, type IRouter } from "express";
import { db, productsTable, categoriesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateProductBody,
  UpdateProductBody,
  UpdateProductParams,
  DeleteProductParams,
  GetProductParams,
  ListProductsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/products", async (req, res) => {
  const query = ListProductsQueryParams.parse(req.query);

  const rows = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      description: productsTable.description,
      categoryId: productsTable.categoryId,
      categoryName: categoriesTable.name,
      categoryColor: categoriesTable.color,
      unit: productsTable.unit,
      currentStock: productsTable.currentStock,
      minimumStock: productsTable.minimumStock,
      createdAt: productsTable.createdAt,
    })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(query.categoryId ? eq(productsTable.categoryId, query.categoryId) : undefined)
    .orderBy(productsTable.name);

  const products = rows.map((r) => ({
    ...r,
    categoryName: r.categoryName ?? "",
    categoryColor: r.categoryColor ?? "#3B82F6",
    currentStock: parseFloat(r.currentStock as unknown as string),
    minimumStock: parseFloat(r.minimumStock as unknown as string),
  }));

  res.json(products);
});

router.post("/products", async (req, res) => {
  const body = CreateProductBody.parse(req.body);
  const [product] = await db.insert(productsTable).values({
    ...body,
    currentStock: String(body.currentStock),
    minimumStock: String(body.minimumStock),
  }).returning();

  const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, product.categoryId));

  res.status(201).json({
    ...product,
    categoryName: cat?.name ?? "",
    categoryColor: cat?.color ?? "#3B82F6",
    currentStock: parseFloat(product.currentStock as unknown as string),
    minimumStock: parseFloat(product.minimumStock as unknown as string),
  });
});

router.get("/products/:id", async (req, res) => {
  const { id } = GetProductParams.parse(req.params);
  const rows = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      description: productsTable.description,
      categoryId: productsTable.categoryId,
      categoryName: categoriesTable.name,
      categoryColor: categoriesTable.color,
      unit: productsTable.unit,
      currentStock: productsTable.currentStock,
      minimumStock: productsTable.minimumStock,
      createdAt: productsTable.createdAt,
    })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(eq(productsTable.id, id));

  if (!rows[0]) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  const r = rows[0];
  res.json({
    ...r,
    categoryName: r.categoryName ?? "",
    categoryColor: r.categoryColor ?? "#3B82F6",
    currentStock: parseFloat(r.currentStock as unknown as string),
    minimumStock: parseFloat(r.minimumStock as unknown as string),
  });
});

router.put("/products/:id", async (req, res) => {
  const { id } = UpdateProductParams.parse(req.params);
  const body = UpdateProductBody.parse(req.body);
  const [product] = await db
    .update(productsTable)
    .set({
      ...body,
      currentStock: String(body.currentStock),
      minimumStock: String(body.minimumStock),
    })
    .where(eq(productsTable.id, id))
    .returning();

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, product.categoryId));

  res.json({
    ...product,
    categoryName: cat?.name ?? "",
    categoryColor: cat?.color ?? "#3B82F6",
    currentStock: parseFloat(product.currentStock as unknown as string),
    minimumStock: parseFloat(product.minimumStock as unknown as string),
  });
});

router.delete("/products/:id", async (req, res) => {
  const { id } = DeleteProductParams.parse(req.params);
  await db.delete(productsTable).where(eq(productsTable.id, id));
  res.json({ success: true });
});

export default router;
