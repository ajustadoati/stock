import { pgTable, serial, text, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { productsTable } from "./products";

export const productTemplatesTable = pgTable("product_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull().default("puerta"), // puerta | ventana | otro
  description: text("description"),
  width: numeric("width", { precision: 8, scale: 2 }),
  height: numeric("height", { precision: 8, scale: 2 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const templateItemsTable = pgTable("template_items", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").notNull().references(() => productTemplatesTable.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => productsTable.id),
  quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull(),
  notes: text("notes"),
});

export const insertProductTemplateSchema = createInsertSchema(productTemplatesTable).omit({ id: true, createdAt: true });
export type InsertProductTemplate = z.infer<typeof insertProductTemplateSchema>;
export type ProductTemplate = typeof productTemplatesTable.$inferSelect;

export const insertTemplateItemSchema = createInsertSchema(templateItemsTable).omit({ id: true });
export type InsertTemplateItem = z.infer<typeof insertTemplateItemSchema>;
export type TemplateItem = typeof templateItemsTable.$inferSelect;
