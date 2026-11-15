import { z } from "zod";

export const priceSchema = z.object({
  amount: z.number({ error: "Enter a price." }).positive("Price must be greater than zero."),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "Use a 3-letter currency code, for example USD."),
});
export type PriceForm = z.infer<typeof priceSchema>;
