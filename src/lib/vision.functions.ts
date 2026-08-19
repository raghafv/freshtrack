import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { detectGroceriesServer, extractLabelDatesServer, parseReceiptServer } from "@/lib/vision.server";
export type { DetectedGrocery, LabelDates, ReceiptLine } from "@/lib/vision.types";

const imageValidator = (input: unknown) => z.object({ image: z.string().min(32) }).parse(input);

export const detectGroceries = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(imageValidator)
  .handler(({ data, context }) => detectGroceriesServer(data.image, context.userId));

export const parseReceipt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(imageValidator)
  .handler(({ data, context }) => parseReceiptServer(data.image, context.userId));

export const extractLabelDates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(imageValidator)
  .handler(({ data, context }) => extractLabelDatesServer(data.image, context.userId));