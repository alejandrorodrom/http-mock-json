import { ValidationIssue, ValidationResult } from '../interfaces/validation.interface';

export type LocalIssue = Omit<ValidationIssue, 'file'>;

export type MethodValidationResult = ValidationResult<LocalIssue>;
export type EndpointValidationResult = ValidationResult<LocalIssue>;
export type ResponseValidationResult = ValidationResult<LocalIssue>;
