import { z } from "zod";

export const receiptSchema = z.object({
  quantity: z.number({ error: "Enter a quantity." }).int("Quantity must be a whole number.").positive("Quantity must be at least 1."),
});
export type ReceiptForm = z.infer<typeof receiptSchema>;
