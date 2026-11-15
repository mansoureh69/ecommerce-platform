import { z } from "zod";

export const productSchema = z.object({
  sku: z.string().trim().min(1, "SKU is required."),
  name: z.string().trim().min(1, "Name is required."),
  description: z.string().trim(),
  categoryId: z.string().min(1, "Choose a category."),
  published: z.boolean().optional(),
});
export type ProductForm = z.infer<typeof productSchema>;

export const variantSchema = z.object({
  sku: z.string().trim().min(1, "SKU is required."),
  name: z.string().trim().min(1, "Name is required."),
  attributes: z.string().refine((value) => parseAttributes(value) !== null, "Use one Name=Value pair per line."),
});
export type VariantForm = z.infer<typeof variantSchema>;

/** "Size=L\nColor=Red" -> record; null when a non-empty line is not Name=Value. */
export function parseAttributes(text: string): Record<string, string> | null {
  const result: Record<string, string> = {};
  for (const line of text.split("\n").map((l) => l.trim()).filter(Boolean)) {
    const at = line.indexOf("=");
    const name = line.slice(0, at).trim();
    const value = line.slice(at + 1).trim();
    if (at < 1 || !name || !value) return null;
    result[name] = value;
  }
  return result;
}

export const formatAttributes = (attributes: Array<{ name: string; value: string }>) =>
  attributes.map((a) => `${a.name}=${a.value}`).join("\n");
