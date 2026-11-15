import { z } from "zod";

const reference = z.string().trim().min(1, "A bank reference is required.").max(200, "Reference is limited to 200 characters.");

export const settlementSchema = z.object({
  amount: z.number({ error: "Enter the settled amount." }).positive("Amount must be greater than zero."),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "Use a 3-letter currency code."),
  reference,
});
export type SettlementForm = z.infer<typeof settlementSchema>;

export const refundSchema = z.object({ reference });
export type RefundForm = z.infer<typeof refundSchema>;
