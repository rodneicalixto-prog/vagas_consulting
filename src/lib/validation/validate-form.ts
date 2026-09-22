import { ZodSchema, ZodError } from "zod";

export function validateFormData<T>(schema: ZodSchema, formData: FormData): T {
  const obj: Record<string, any> = {};

  for (const [key, value] of formData.entries()) {
    if (obj[key] === undefined) {
      obj[key] = value;
    } else if (Array.isArray(obj[key])) {
      obj[key].push(value);
    } else {
      obj[key] = [obj[key], value];
    }
  }

  const result = schema.safeParse(obj);

  if (!result.success) {
    const errorMsg = result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Validação falhou: ${errorMsg}`);
  }

  return result.data as T;
}
