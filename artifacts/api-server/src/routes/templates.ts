import { Router, type IRouter } from "express";
import { db, productTemplatesTable, templateItemsTable, productsTable, categoriesTable, movementsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import {
  CreateTemplateBody,
  UpdateTemplateBody,
  UpdateTemplateParams,
  DeleteTemplateParams,
  GetTemplateParams,
  ProduceTemplateParams,
  ProduceTemplateBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function getTemplateWithItems(id: number) {
  const [template] = await db.select().from(productTemplatesTable).where(eq(productTemplatesTable.id, id));
  if (!template) return null;

  const items = await db
    .select({
      id: templateItemsTable.id,
      templateId: templateItemsTable.templateId,
      productId: templateItemsTable.productId,
      productName: productsTable.name,
      categoryName: categoriesTable.name,
      unit: productsTable.unit,
      quantity: templateItemsTable.quantity,
      notes: templateItemsTable.notes,
    })
    .from(templateItemsTable)
    .leftJoin(productsTable, eq(templateItemsTable.productId, productsTable.id))
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(eq(templateItemsTable.templateId, id));

  return {
    ...template,
    width: template.width ? parseFloat(template.width as unknown as string) : null,
    height: template.height ? parseFloat(template.height as unknown as string) : null,
    items: items.map((item) => ({
      ...item,
      productName: item.productName ?? "",
      categoryName: item.categoryName ?? "",
      unit: item.unit ?? "",
      quantity: parseFloat(item.quantity as unknown as string),
    })),
  };
}

router.get("/templates", async (_req, res) => {
  const templates = await db.select().from(productTemplatesTable).orderBy(productTemplatesTable.name);

  const result = await Promise.all(
    templates.map((t) => getTemplateWithItems(t.id))
  );

  res.json(result.filter(Boolean));
});

router.post("/templates", async (req, res) => {
  const body = CreateTemplateBody.parse(req.body);

  const [template] = await db.insert(productTemplatesTable).values({
    name: body.name,
    type: body.type,
    description: body.description ?? null,
    width: body.width != null ? String(body.width) : null,
    height: body.height != null ? String(body.height) : null,
  }).returning();

  if (body.items.length > 0) {
    await db.insert(templateItemsTable).values(
      body.items.map((item) => ({
        templateId: template.id,
        productId: item.productId,
        quantity: String(item.quantity),
        notes: item.notes ?? null,
      }))
    );
  }

  const result = await getTemplateWithItems(template.id);
  res.status(201).json(result);
});

router.get("/templates/:id", async (req, res) => {
  const { id } = GetTemplateParams.parse(req.params);
  const result = await getTemplateWithItems(id);
  if (!result) {
    res.status(404).json({ error: "Template not found" });
    return;
  }
  res.json(result);
});

router.put("/templates/:id", async (req, res) => {
  const { id } = UpdateTemplateParams.parse(req.params);
  const body = UpdateTemplateBody.parse(req.body);

  const [template] = await db
    .update(productTemplatesTable)
    .set({
      name: body.name,
      type: body.type,
      description: body.description ?? null,
      width: body.width != null ? String(body.width) : null,
      height: body.height != null ? String(body.height) : null,
    })
    .where(eq(productTemplatesTable.id, id))
    .returning();

  if (!template) {
    res.status(404).json({ error: "Template not found" });
    return;
  }

  // Replace all items
  await db.delete(templateItemsTable).where(eq(templateItemsTable.templateId, id));

  if (body.items.length > 0) {
    await db.insert(templateItemsTable).values(
      body.items.map((item) => ({
        templateId: id,
        productId: item.productId,
        quantity: String(item.quantity),
        notes: item.notes ?? null,
      }))
    );
  }

  const result = await getTemplateWithItems(id);
  res.json(result);
});

router.delete("/templates/:id", async (req, res) => {
  const { id } = DeleteTemplateParams.parse(req.params);
  await db.delete(productTemplatesTable).where(eq(productTemplatesTable.id, id));
  res.json({ success: true });
});

router.post("/templates/:id/produce", async (req, res) => {
  const { id } = ProduceTemplateParams.parse(req.params);
  const body = ProduceTemplateBody.parse(req.body);

  const template = await getTemplateWithItems(id);
  if (!template) {
    res.status(404).json({ error: "Template not found" });
    return;
  }

  if (template.items.length === 0) {
    res.status(400).json({ error: "La plantilla no tiene materiales configurados" });
    return;
  }

  // Load current stock for all products involved
  const productIds = template.items.map((item) => item.productId);
  const products = await db.select().from(productsTable).where(inArray(productsTable.id, productIds));
  const productMap = new Map(products.map((p) => [p.id, p]));

  // Check for insufficient stock
  const insufficientStock: { productName: string; required: number; available: number }[] = [];
  for (const item of template.items) {
    const product = productMap.get(item.productId);
    if (!product) continue;
    const available = parseFloat(product.currentStock as unknown as string);
    const required = item.quantity * body.quantity;
    if (available < required) {
      insufficientStock.push({
        productName: item.productName,
        required,
        available,
      });
    }
  }

  if (insufficientStock.length > 0) {
    res.status(400).json({
      success: false,
      templateName: template.name,
      unitsProduced: 0,
      movements: [],
      insufficientStock,
    });
    return;
  }

  // Execute all movements in a transaction
  const [cat] = await db
    .select({ name: categoriesTable.name })
    .from(categoriesTable)
    .where(eq(categoriesTable.id, products[0]?.categoryId ?? 0))
    .limit(1);

  const movements: any[] = [];

  await db.transaction(async (tx) => {
    for (const item of template.items) {
      const product = productMap.get(item.productId)!;
      const stockBefore = parseFloat(product.currentStock as unknown as string);
      const qtyToDeduct = item.quantity * body.quantity;
      const stockAfter = stockBefore - qtyToDeduct;

      const [mov] = await tx.insert(movementsTable).values({
        productId: item.productId,
        type: "salida",
        quantity: String(qtyToDeduct),
        notes: body.notes ? `[${template.name} x${body.quantity}] ${body.notes}` : `[${template.name} x${body.quantity}]`,
        stockBefore: String(stockBefore),
        stockAfter: String(stockAfter),
      }).returning();

      await tx
        .update(productsTable)
        .set({ currentStock: String(stockAfter) })
        .where(eq(productsTable.id, item.productId));

      // Refresh local product map for next iteration
      product.currentStock = String(stockAfter) as any;

      movements.push({
        ...mov,
        productName: item.productName,
        categoryName: item.categoryName,
        quantity: parseFloat(mov.quantity as unknown as string),
        stockBefore: parseFloat(mov.stockBefore as unknown as string),
        stockAfter: parseFloat(mov.stockAfter as unknown as string),
      });
    }
  });

  res.status(201).json({
    success: true,
    templateName: template.name,
    unitsProduced: body.quantity,
    movements,
    insufficientStock: [],
  });
});

export default router;
