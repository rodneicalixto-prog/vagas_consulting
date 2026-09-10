type PostgrestLikeError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

export function isMissingColumn(error: PostgrestLikeError | null, column: string) {
  if (!error) return false;

  const description = [error.message, error.details, error.hint]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    (error.code === "42703" || error.code === "PGRST204") &&
    description.includes(column.toLowerCase())
  );
}
