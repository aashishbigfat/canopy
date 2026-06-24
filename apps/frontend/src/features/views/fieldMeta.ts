/**
 * Shared metadata for the list-view filter builder & field picker.
 *
 * Mirrors the backend's logical field types and operator set
 * (app/core/entity_filter.py). Keep the two in sync.
 */

export type LogicalType = "string" | "lookup" | "bool" | "number" | "date";

/** Map a StandardField/AdditionalField `field_type` to a logical filter type. */
export function logicalType(fieldType: string | null | undefined): LogicalType {
  switch ((fieldType || "text").toLowerCase()) {
    case "lookup":
      return "lookup";
    case "boolean":
    case "checkbox":
      return "bool";
    case "number":
    case "currency":
      return "number";
    case "date":
    case "datetime":
      return "date";
    default:
      // text, email, phone, url, textarea, select, multiselect, …
      return "string";
  }
}

export interface OperatorDef {
  value: string;
  label: string;
  /** false = no value input (e.g. is empty); "two" = range (between). */
  arity: "one" | "two" | "none";
}

export const OPERATORS_BY_TYPE: Record<LogicalType, OperatorDef[]> = {
  string: [
    { value: "equals", label: "equals", arity: "one" },
    { value: "not_equals", label: "not equal to", arity: "one" },
    { value: "contains", label: "contains", arity: "one" },
    { value: "starts_with", label: "starts with", arity: "one" },
    { value: "is_empty", label: "is empty", arity: "none" },
    { value: "is_not_empty", label: "is not empty", arity: "none" },
  ],
  lookup: [
    { value: "equals", label: "is", arity: "one" },
    { value: "not_equals", label: "is not", arity: "one" },
    { value: "is_empty", label: "is empty", arity: "none" },
    { value: "is_not_empty", label: "is not empty", arity: "none" },
  ],
  bool: [{ value: "equals", label: "equals", arity: "one" }],
  number: [
    { value: "equals", label: "equals", arity: "one" },
    { value: "not_equals", label: "not equal to", arity: "one" },
    { value: "greater_than", label: "greater than", arity: "one" },
    { value: "less_than", label: "less than", arity: "one" },
    { value: "between", label: "between", arity: "two" },
    { value: "is_empty", label: "is empty", arity: "none" },
    { value: "is_not_empty", label: "is not empty", arity: "none" },
  ],
  date: [
    { value: "equals", label: "on", arity: "one" },
    { value: "greater_than", label: "after", arity: "one" },
    { value: "less_than", label: "before", arity: "one" },
    { value: "between", label: "between", arity: "two" },
    { value: "is_empty", label: "is empty", arity: "none" },
    { value: "is_not_empty", label: "is not empty", arity: "none" },
  ],
};

export function operatorsFor(fieldType: string | null | undefined): OperatorDef[] {
  return OPERATORS_BY_TYPE[logicalType(fieldType)];
}

/** Operators for an already-resolved logical type (catalog fields). */
export function operatorsForType(lt: LogicalType): OperatorDef[] {
  return OPERATORS_BY_TYPE[lt];
}

export function operatorArityForType(
  lt: LogicalType,
  operator: string,
): "one" | "two" | "none" {
  return OPERATORS_BY_TYPE[lt].find((o) => o.value === operator)?.arity ?? "one";
}

export function operatorArity(
  fieldType: string | null | undefined,
  operator: string,
): "one" | "two" | "none" {
  return operatorsFor(fieldType).find((o) => o.value === operator)?.arity ?? "one";
}
