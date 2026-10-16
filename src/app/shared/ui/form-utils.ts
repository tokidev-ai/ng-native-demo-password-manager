import type { FieldTree } from '@angular/forms/signals';

/** The first validation message of a field, or '' when it has none. */
export function errorText<T>(field: FieldTree<T>): string {
  return field().errors()[0]?.message ?? '';
}
