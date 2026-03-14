import { pgTable, serial, text, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { productsTable } from "./products";

export const movementsTable = pgTable("movements", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => productsTable.id),
  type: text("type").notNull(), // 'entrada' | 'salida'
  quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull(),
  notes: text("notes"),
  stockBefore: numeric("stock_before", { precision: 12, scale: 3 }).notNull(),
  stockAfter: numeric("stock_after", { precision: 12, scale: 3 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMovementSchema = createInsertSchema(movementsTable).omit({ id: true, createdAt: true });
export type InsertMovement = z.infer<typeof insertMovementSchema>;
export type Movement = typeof movementsTable.$inferSelect;
