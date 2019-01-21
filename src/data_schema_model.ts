import * as validations from './validation';

import * as ajv from 'ajv';

import { plural, safeEval } from './form_utils';
import { JSONSchemaType, JSONSchema } from './json_schema';
import { config } from './config';
import { expandSchemas } from './schema_exploder';

export type ListItem = {
  text: string;
  value: string;
};

type SchemaOptions = {
  parent?: Schema;
  required?: boolean;
  key?: string;
  createCombinations?: boolean;
};

export class Schema {
  // store: typeof FormStore.Type;
  parent: Schema;

  properties: { [index: string]: Schema };
  items: Schema;
  type: JSONSchemaType;
  minimum: number;
  maximum: number;
  exclusiveMinimum: number;
  exclusiveMaximum: number;
  minLength: number;
  maxLength: number;
  minItems: number;
  maxItems: number;
  uniqueItems: boolean;
  pattern: RegExp;
  default: any;
  required: boolean;
  readOnly: boolean;
  expression: string;
  validationMessage: string;
  enum: ListItem[];
  key: string;
  combinations: Schema[];

  constructor(
    schema: JSONSchema,
    { parent = null, required = false, key = null, createCombinations = true }: SchemaOptions = {}
  ) {
    if (createCombinations) {
      // create all possible combinations of this schems
      let { schemas, exploded } = expandSchemas(schema);

      if (exploded) {
        this.combinations = schemas.map(s => new Schema(s, { createCombinations: false }));
      }
    }

    this.parent = parent;
    this.key = key;

    this.init(schema, [
      'readOnly',
      'type',
      'required',
      'default',
      'minimum',
      'maximum',
      'exclusiveMaximum',
      'exclusiveMinimum',
      'minLength',
      'maxLength',
      'uniqueItems',
      'minItems',
      'maxItems',
      'expression',
      'validationMessage',
      'enum'
    ]);

    if (required) {
      this.required = required;
    }

    if (schema.pattern != null) {
      this.pattern = schema.pattern ? new RegExp(schema.pattern) : null;
    }

    if (schema.type === 'object') {
      this.properties = {};
      for (let key of Object.getOwnPropertyNames(schema.properties)) {
        this.properties[key] = new Schema(schema.properties[key] as JSONSchema, {
          parent: this,
          required: schema.required && schema.required.includes(key),
          key,
          createCombinations: false
        });
      }
    }

    if (schema.type === 'array') {
      this.items = new Schema(schema.items as JSONSchema, this);
    }
  }

  // randomValue() {
  //   switch (this.type) {
  //     case 'string':
  //       return random.words(2);
  //     case 'boolean':
  //       return random.boolean();
  //     case 'id':
  //       return '1';
  //     case 'integer':
  //       return random.int();
  //     case 'number':
  //       return random.float();
  //   }
  //   return undefined;
  // }

  init<T>(schema: T, keys: Array<keyof Schema>) {
    for (let key of keys) {
      if ((schema as any)[key] != null) {
        this[key] = (schema as any)[key];
      }
    }
  }

  defaultValue(): any {
    const value: { [index: string]: any } = {};

    if (this.type === 'array') {
      let result = [];
      for (let i = 0; i < this.minItems || 0; i++) {
        result.push(this.items.defaultValue());
      }
      return result;
    }

    for (let key of Object.getOwnPropertyNames(this.properties)) {
      let obj = this.properties[key];
      if (obj.type === 'object' || obj.type === 'array') {
        value[key] = this.properties[key].defaultValue();
      } else if (obj.type !== 'expression') {
        value[key] = this.properties[key].default;
      }
    }

    return value;
  }

  parse(value: any) {
    switch (this.type) {
      case 'date':
        return new Date(value);
      case 'integer':
        return parseInt(value, 10);
      case 'number':
        return parseFloat(value);
      case 'boolean':
        return value === true || value === 'true' || value === 'True';
      default:
        return value;
    }
  }

  /* =========================================================
      Validations
     ======================================================== */

  validateDataset(dataset: any) {
    if (this.combinations) {
      let results = [];
      // we browse all combinations and fid a first passing one
      for (let combination of this.combinations) {
        let result = combination.validateSingle(dataset);
        if (!result) {
          return undefined; // first pass is all we need
        }
        results.push(result);
      }
      return results.length > 1 ? results : results[0];
    }

    return this.validateSingle(dataset);
  }

  validateSingle(dataset: any) {
    let result: any = {};

    if (this.properties) {
      for (let key of Object.getOwnPropertyNames(this.properties)) {
        let property = this.properties[key];

        if (property.type === 'object') {
          let res = property.validateSingle(dataset[key]);
          if (res) {
            result[key] = res;
          }
        } else if (property.type === 'array') {
          result[key] = [];
          for (let item of dataset[key]) {
            result[key].push(property.items.validateSingle(item));
          }
        } else {
          // console.log(dataset);

          let res: any = dataset && property.validateValue(dataset[key], dataset);
          if (res) {
            result[key] = res;
          }
          // console.log(key);
          // console.log(res);
          // console.log(result);
        }
      }
    }

    return Object.getOwnPropertyNames(result).length === 0 ? undefined : result;
    // return result;
  }

  validateValue(value: any, datasetRoot: any = null): string {
    console.log('Validating: ');
    const { parent, ...rest } = this;
    console.log(rest);

    // expression
    let parsed = value != null && value !== '' ? this.parse(value) : value;
    if (this.expression && !safeEval(datasetRoot, this.expression, parsed)) {
      return this.validationMessage || 'Unexpected value';
    }

    // console.log(this.key + ': ' + this.required);

    if (this.required && (value == null || value === '' || value === false)) {
      return this.validationMessage || config.i18n`Value is required`;
    }

    // types
    if (this.type === 'integer') {
      return this.isValid(validations.IntValidator(value) || this.numberValidations(value));
    }
    if (this.type === 'number') {
      return this.isValid(validations.FloatValidator(value) || this.numberValidations(value));
    }
    if (this.type === 'string') {
      return this.isValid(this.stringValidations(value));
    }
    if (this.type === 'array') {
      return this.isValid(this.arrayValidations(value));
    }

    return undefined;
  }

  private numberValidations(value: string) {
    let num = this.parse(value);
    if (this.minimum != null && num < this.minimum) {
      return config.i18n`Value has to be higher or equal than ${this.minimum.toString()}`;
    }
    if (this.maximum != null && num > this.maximum) {
      return config.i18n`Value has to be lower or equal than ${this.maximum.toString()}`;
    }
    if (this.exclusiveMinimum != null && num <= this.exclusiveMinimum) {
      return config.i18n`Value has to be higher than ${this.exclusiveMinimum.toString()}`;
    }
    if (this.exclusiveMaximum != null && num >= this.exclusiveMaximum) {
      return config.i18n`Value has to be lower than ${this.exclusiveMaximum.toString()}`;
    }
  }

  private arrayValidations(value: any[]) {
    if (this.minItems != null && value.length < this.minItems) {
      return config.i18n`Collection has to contain at least ${this.minItems.toString()} ${plural(
        'item',
        this.minItems
      )}`;
    }
    if (this.maxItems != null && value.length > this.maxItems) {
      return config.i18n`Collection has to contain maximum ${this.maxItems.toString()} ${plural(
        'item',
        this.maxItems
      )}`;
    }
    if (this.uniqueItems && value.length > 1) {
      const invalid: number[] = [];
      const array = value.map(v => v.toJS());
      const keys = Object.getOwnPropertyNames(array[0]);

      for (let i = 0; i < array.length; i++) {
        if (array.some(v => v !== array[i] && keys.every(key => v[key] === value[i][key]))) {
          invalid.push(i + 1);
        }
      }

      if (invalid.length) {
        return (
          this.validationMessage ||
          `Collection needs to contain unique items. Items [${invalid.join(', ')}] are repetitive`
        );
      }
    }
  }

  private stringValidations(value: string) {
    // console.log(this.key);

    if (value && this.pattern && !this.pattern.test(value)) {
      return 'Incorrect format';
    }

    if (this.minLength != null && value && value.length < this.minLength) {
      return `Too short. Has to contain at least ${this.minLength} ${plural(
        'character',
        this.minLength
      )}`;
    }

    if (this.maxLength != null && value && value.length > this.maxLength) {
      return `Too long. Has to contain maximum ${this.maxLength} ${plural(
        'character',
        this.maxLength
      )}`;
    }

    return undefined;
  }

  private isValid(result: string) {
    return result ? this.validationMessage || result : undefined;
  }
}
