export interface ValidationIssue {
  file: string;
  endpoint?: string;
  method?: string;
  message: string;
}

export interface ValidationResult<T = ValidationIssue> {
  errors: T[];
  warnings: T[];
}
