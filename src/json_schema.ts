export type JSONSchema7Version =
  | 'http://json-schema.org/schema#'
  | 'http://json-schema.org/hyper-schema#'
  | 'http://json-schema.org/draft-07/schema#'
  | 'http://json-schema.org/draft-07/hyper-schema#';

export type JSONSchema7TypeName =
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'object'
  | 'array'
  | 'null';
export type JSONSchema7Type = JSONSchema7Array[] | boolean | number | null | object | string;

// Workaround for infinite type recursion
// https://github.com/Microsoft/TypeScript/issues/3496#issuecomment-128553540
export interface JSONSchema7Array extends Array<JSONSchema7Type> {}

export type JSONSchemaType = JSONSchema7Type;

export type ErrorMessages = {
  [index: string]: ErrorMessage;
};

export type ErrorMessage = string | ErrorMessages;

export interface JSONSchema {
  /* =========================================================
      OVERRIDEN
     ======================================================== */

  expression?: string;
  validationExpression?: string;
  validationGroup?: string;
  properties?: {
    [key: string]: JSONSchema;
  };
  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.1
   */
  type?: JSONSchema7TypeName;
  enum?: JSONSchema7Type[];
  const?: JSONSchema7Type;

  /* =========================================================
      ORIGINAL
     ======================================================== */

  $id?: string;
  $ref?: string;
  $schema?: JSONSchema7Version;
  $comment?: string;
  $import?: string;
  $enum?: Array<{ text: string; value: string; icon?: string }>;

  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.2
   */
  multipleOf?: number;
  maximum?: number;
  exclusiveMaximum?: number;
  minimum?: number;
  exclusiveMinimum?: number;

  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.3
   */
  maxLength?: number;
  minLength?: number;
  pattern?: string;

  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.4
   */
  items?: JSONSchema | JSONSchema[];
  additionalItems?: JSONSchema;
  maxItems?: number;
  minItems?: number;
  uniqueItems?: boolean;
  contains?: JSONSchema;

  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.5
   */
  maxProperties?: number;
  minProperties?: number;
  required?: string[];

  patternProperties?: {
    [key: string]: JSONSchema;
  };
  additionalProperties?: JSONSchema | boolean;
  dependencies?: {
    [key: string]: JSONSchema | string[];
  };
  propertyNames?: JSONSchema;
  errorMessage?: ErrorMessage;

  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.6
   */
  if?: JSONSchema;
  then?: JSONSchema;
  else?: JSONSchema;

  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.7
   */
  allOf?: JSONSchema[];
  anyOf?: JSONSchema[];
  oneOf?: JSONSchema[];
  not?: JSONSchema;

  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-7
   */
  format?: string;

  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-8
   */
  contentMediaType?: string;
  contentEncoding?: string;

  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-9
   */
  definitions?: {
    [key: string]: JSONSchema;
  };

  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-10
   */
  title?: string;
  description?: string;
  default?: JSONSchema7Type;
  readOnly?: boolean;
  writeOnly?: boolean;
  examples?: JSONSchema7Type;
}
