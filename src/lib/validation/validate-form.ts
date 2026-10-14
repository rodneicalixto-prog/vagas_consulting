import type { ZodSchema } from "zod";

export function validateFormData<T>(schema: ZodSchema, formData: FormData): T {
  const obj: Record<string, FormDataEntryValue | FormDataEntryValue[]> = {};

  for (const [key, value] of formData.entries()) {
    if (obj[key] === undefined) {
      obj[key] = value;
    } else {
      const atual = obj[key];
      obj[key] = Array.isArray(atual) ? [...atual, value] : [atual, value];
    }
  }

  const result = schema.safeParse(obj);

  if (!result.success) {
    const errorMsg = result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Validação falhou: ${errorMsg}`);
  }

  return result.data as T;
}
