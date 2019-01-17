import * as val from './validation';

import { plural, safeEval } from './form_utils';
import { JSONSchemaType, JSONSchema } from './json_schema';
import { config } from './config';
import { DataSet } from './form_store';

export type ListItem = {
  text: string;
  value: string;
};

type Strategy = 'allOf' | 'anyOf' | 'oneOf';

enum Report {
  Failures,
  Passes
}

type ValidationMap = { [index: string]: ValidationResult };
type ValidationResult = {
  [index: string]: any;
  REQUIRED?: string[];
  VALUES?: ValidationMap[];
  VALIDATION?: Array<{
    anyOf?: ValidationResult[];
    oneOf?: ValidationResult[];
    allOf?: ValidationResult[];
  }>;
};

export class Schema {
  // store: typeof FormStore.Type;
  parent: Schema;
  key: string;

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
  required: string[];
  readOnly: boolean;
  expression: string;
  validationMessage: string;
  enum: ListItem[];

  anyOf: Schema[];
  allOf: Schema[];
  oneOf: Schema[];

  constructor(schema: JSONSchema, parent: Schema = null, key?: string) {
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

    // special field where we will keep references to required items
    if (schema.properties) {
      schema.properties.REQUIRED = { type: 'array', items: { type: 'string' } };
    }

    if (schema.pattern != null) {
      this.pattern = schema.pattern ? new RegExp(schema.pattern) : null;
    }

    if (schema.type === 'object') {
      this.properties = {};
      for (let key of Object.getOwnPropertyNames(schema.properties)) {
        this.properties[key] = new Schema(schema.properties[key], this, key);
      }
    }

    if (schema.type === 'array') {
      this.items = new Schema(schema.items as JSONSchema, this, key);
    }

    if (schema.anyOf) {
      let { anyOf, ...rest } = schema;
      this.anyOf = anyOf.map(s => {
        return new Schema({ ...rest, ...s }, this, key);
      });
    }
    if (schema.allOf) {
      let { allOf, ...rest } = schema;
      this.allOf = allOf.map(s => {
        return new Schema({ ...rest, ...s }, this, key);
      });
    }
    if (schema.oneOf) {
      let { oneOf, ...rest } = schema;
      this.oneOf = oneOf.map(s => {
        return new Schema({ ...rest, ...s }, this, key);
      });
    }
  }

  static create(jsonSchema: JSONSchema) {
    let schema = new Schema(jsonSchema);
    
    // this duplicates schemas
    if (jsonSchema.anyOf) {
      // return multiple schemas
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

  // processStrategy(result: any, key: string, results: any[], strategy: Strategy) {
  //   console.log('------------ Processing');
  //   console.log(key);
  //   console.log(results);
  //   console.log(strategy);

  //   if (strategy === 'allOf') {
  //     let map = results.map(r => r && r[key]); /*?*/
  //     result[key] = map.every(r => !r) ? undefined : [].concat(...map.filter(f => f));
  //   } else if (strategy === 'anyOf') {
  //     let map = results.map(r => r && r[key]);
  //     result[key] = map.some(r => !r) ? undefined : map;
  //     //result[key] = results.some(r => !r || !r[key]) ? undefined : results.find(r => r && r[key])[key]; //config.i18n`Possibly: ${results.find(r => r && (r[key]))[key]}`;
  //   } else if (strategy === 'oneOf') {
  //     //result[key] = results.filter(r => !r || !r[key]).length === 1 ? undefined : config.i18n`Only one: ${results.find(r => r && (r[key]))}`;
  //   }
  // }

  // extractMessages(schema: Schema, result: any, results: any[]): any {
  //   let strategy: Strategy = schema.anyOf ? 'anyOf' : schema.allOf ? 'allOf' : schema.oneOf ? 'oneOf' : undefined; /*?*/
  //   schema.processStrategy(result, 'REQUIRED', results, strategy);

  //   if (schema.properties) {
  //     for (let key of Object.getOwnPropertyNames(schema.properties)) {
  //       let property = schema.properties[key];
  //       strategy = property.anyOf ? 'anyOf' : property.allOf ? 'allOf' : property.oneOf ? 'oneOf' : strategy; /*?*/

  //       // console.log(key);
  //       // console.log(results);
  //       // console.log(results[key]);

  //       if (property.type === 'object') {
  //         result[key] = {};

  //         // schema.processStrategy(result, 'REQUIRED', results, strategy);

  //         // property.extractMessages(
  //         //   schema.properties[key],
  //         //   result[key],
  //         //   results[key],
  //         //   strategy
  //         // );
  //       } else if (property.type === 'array') {
  //         // result[key] = [];
  //         // for (let item of dataset[key]) {
  //         //   result[key].push(this.items.validateAll(item));
  //         // }
  //       } else {
  //         schema.processStrategy(result, key, results[key], strategy);
  //       }
  //     }
  //   }

  //   return result;
  // }

  // validate(dataset: any) {
  //   const results = this.validateAll(dataset); /*?*/
  //   const res = this.extractMessages(this, {}, results);
  //   return res;
  // }

  interpretParts(final: any, validation: any, type: string) {
    if (validation[type]) {
      // collect all required
      for (let anyPart of validation[type]) {
        // it could be a message
        if (typeof anyPart === 'string') {
          return { [type]: validation[type] };
        }

        for (let key of Object.getOwnPropertyNames(anyPart)) {
          if (key === 'VALIDATION') {
            return this.interpretResults(anyPart[key]);
          }
          // join from all other parts
          if (!final[key]) {
            let values: string[] = []
            final[key] = { [type]: values }
          
            // copy all values
            for (let testPart of validation[type]) {
              for (let testKey of Object.getOwnPropertyNames(testPart)) {
                if (!values.includes(testPart[testKey])) {
                  values.push(testPart[testKey]);
                }
              }
            }
          }

          // let message = anyPart[key]; /*?*/
          // if (message === 'REQUIRED') {
          //   // we need to create a possibilities for each group
          //   // we need to find which elements are not in the group
          //   // and tell that we can use use instead of a current one
          //   final[key] = 'REQUIRED';
          // }
        }
      }
    }
  }

  interpretResults(result: ValidationResult) {
    console.log(JSON.stringify(result, null, 2));
    let final: any = {};
    if (!result) {
      return result;
    }
    if (typeof result === 'string') {
      return result;
    }
    if (result.VALIDATION) {
      for (let validation of result.VALIDATION) {
        this.interpretParts(final, validation, 'allOf');
        this.interpretParts(final, validation, 'anyOf');
        this.interpretParts(final, validation, 'oneOf');
      }
    } else {
      for (let key of Object.getOwnPropertyNames(result)) {
        final[key] = this.interpretResults(result[key]);
      }
    }
    return final;
  }

  // TODO: Allow to validate only a specified property
  validateAll(dataset: any, report = Report.Failures): ValidationResult {
    let results = [];
    if (this.anyOf || this.allOf || this.oneOf) {
      if (this.anyOf) {
        let anyOf = this.validateClone(this.anyOf, dataset, Report.Failures);
        if (anyOf.every(a => !!a)) {
          results.push({ anyOf });
        }
      }
      if (this.allOf) {
        let allOf = this.validateClone(this.allOf, dataset, Report.Failures);
        if (allOf.some(a => !!a)) {
          results.push({ allOf: allOf.filter(a => !!a) });
        }
      }
      if (this.oneOf) {
        let oneOf = this.validateClone(this.oneOf, dataset, Report.Passes); /*?*/

        if (oneOf.length > 0) {
          // we can either be at the end node, or in parent node
          // end nodes contain "message" and "invalid" property
          if (oneOf[0].message && oneOf[0].invalid != null) {
            if (oneOf.filter(o => o.invalid === false).length != 1) {
              oneOf = oneOf.map(o => o.message);
            } else {
              oneOf = [];
            }
          } else {
            // we are in a node with properties
            // check for required symbols
            // no other things are currently supported
            let required = oneOf.map(p => {
              let keys = Object.getOwnPropertyNames(p);
              let selectedKeys = keys.filter(key => p[key].message === 'REQUIRED');
              return selectedKeys.map(k => ({ key: k, ...p[k] }));
            }); /*?*/

            let validRequired = required
              .map(r => r.filter(s => s.invalid).length)
              .filter(t => t === 0).length; /*?*/
            if (validRequired != 1) {
              // override all required keys to specify that they are required
              oneOf.forEach((o, i) => {
                required[i].forEach(r => (o[r.key] = 'REQUIRED'));
              });
            }
          }
        }

        // we need to compare if more validations fulfil the target
        //if (oneOf.filter(a => !a).length !== 1) {
        if (oneOf.length) {
          results.push({ oneOf: oneOf.filter(a => !!a) });
        }
        //}
      }
      // console.log(results);

      return results.length ? { VALIDATION: results } : undefined;
    }
    // console.log(this.key);
    // console.log(dataset);

    return this.validateSingle(dataset, report);
  }

  validateClone(schemas: Schema[], dataset: any, report: Report) {
    let results = [];
    // results.push(key)

    for (let o of schemas) {
      results.push(o.validateAll(dataset, report));
    }

    // console.log(results);

    return results;
  }

  validateSingle(dataset: any, report: Report) {
    // console.log(dataset);

    if (this.properties) {
      let result: any = {};

      // let validation = this.validateValue(dataset); /*?*/
      // if (validation && validation.length) {
      //   result.REQUIRED = validation;
      // }

      for (let key of Object.getOwnPropertyNames(this.properties)) {
        let property = this.properties[key];

        // console.log('PROP: ' + key);
        // console.log(dataset);

        if (key === 'REQUIRED') {
          if (property.parent.required) {
            for (let p of property.parent.required) {
              // console.log(p);
              // console.log(dataset[p]);

              let res = this.isValid(val.m(!dataset[p], 'REQUIRED'), report);
              if (res) {
                result[p] = res;
              }
            }
            // let reqs = property.parent.required.for(key => !dataset[key] && key).filter(f => !!f);
            // if (reqs.length) {
            //   result[key] = reqs;
            // }
          }
        } else if (property.type === 'object') {
          // console.log('DIGGING: ' + key);

          const deeper = dataset[key];
          let res = property.validateAll(deeper);
          if (res) {
            result[key] = res;
          }
        } else if (property.type === 'array') {
          result[key] = [];
          for (let item of dataset[key]) {
            result[key].push(this.items.validateAll(item));
          }
        } else {
          let res: any = property.validateAll(dataset);
          if (res) {
            result[key] = res;
          }
        }
      }

      return Object.getOwnPropertyNames(result).length === 0 ? undefined : result;
    }
    return this.validateValue(dataset, report);
  }

  validateValue(dataset: any, report: Report): string {
    let value = this.key ? dataset && dataset[this.key] : dataset;

    // expression
    let parsed = value != null && value !== '' ? this.parse(value) : value;
    if (this.expression && !safeEval(dataset, this.expression, parsed)) {
      return this.validationMessage || 'Unexpected value';
    }
    // if (this.type === 'object') {
    //   return this.isValid(this.objectValidation(value));
    // }
    if (this.type === 'integer') {
      if (val.IntValidator(value)) {
        return this.isValid(val.m(false, 'INTEGER'), report);
      }
      return this.isValid(this.numberValidations(value), report);
    }
    if (this.type === 'number') {
      if (val.FloatValidator(value)) {
        return this.isValid(val.m(false, 'FLOAT'), report);
      }
      return this.isValid(this.numberValidations(value), report);
    }
    if (this.type === 'string') {
      return this.isValid(this.stringValidations(value), report);
    }
    if (this.type === 'array') {
      return this.isValid(this.arrayValidations(value), report);
    }

    return undefined;
  }

  // private objectValidation(value: any) {
  //   // console.log(this.required);
  //   // console.log(value);

  //   if (this.required) {
  //     return this.required.map(key => !value[key] && key).filter(f => f);
  //   }
  //   return undefined;
  // }

  private numberValidations(value: string) {
    let num = this.parse(value);
    if (this.minimum != null) {
      return val.m(
        num < this.minimum,
        config.i18n`Value has to be higher or equal than ${this.minimum.toString()}`
      );
    }
    if (this.maximum != null) {
      return val.m(
        num > this.maximum,
        config.i18n`Value has to be lower or equal than ${this.maximum.toString()}`
      );
    }
    if (this.exclusiveMinimum != null) {
      return val.m(
        num <= this.exclusiveMinimum,
        config.i18n`Value has to be higher than ${this.exclusiveMinimum.toString()}`
      );
    }
    if (this.exclusiveMaximum != null) {
      return val.m(
        num >= this.exclusiveMaximum,
        config.i18n`Value has to be lower than ${this.exclusiveMaximum.toString()}`
      );
    }
  }

  private arrayValidations(value: any[]) {
    if (this.minItems != null) {
      return val.m(
        value.length < this.minItems,
        config.i18n`Collection has to contain at least ${this.minItems.toString()} ${plural(
          'item',
          this.minItems
        )}`
      );
    }
    if (this.maxItems != null) {
      return val.m(
        value.length > this.maxItems,
        config.i18n`Collection has to contain maximum ${this.maxItems.toString()} ${plural(
          'item',
          this.maxItems
        )}`
      );
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

      return val.m(
        invalid.length > 0,
        this.validationMessage ||
          `Collection needs to contain unique items. Items [${invalid.join(', ')}] are repetitive`
      );
    }
  }

  private stringValidations(value: string) {
    if (value && this.pattern) {
      return val.m(!this.pattern.test(value), 'Incorrect format');
    }

    if (this.minLength != null && value) {
      return val.m(
        value.length < this.minLength,
        `Too short. Has to contain at least ${this.minLength} ${plural(
          'character',
          this.minLength
        )}`
      );
    }

    if (this.minLength != null && value) {
      return val.m(
        value.length > this.maxLength,
        `Too long. Has to contain maximum ${this.maxLength} ${plural('character', this.maxLength)}`
      );
    }

    return undefined;
  }

  // private isValid(result: string[]): any;
  // private isValid(result: string): any;
  private isValid(result: { invalid: boolean; message: string }, report: Report): any {
    if (report === Report.Failures) {
      return result && result.invalid ? this.validationMessage || result.message : undefined;
    }
    return result ? this.validationMessage || result : undefined;
  }
}

// NOTE

// {
//   message: 'REQUIRED',
//   anyOf: validation.anyOf
//     .map(
//       (p, j) =>
//         i !== j &&
//         Object.keys(p)
//           .map(okey => key !== okey && p[okey] === 'REQUIRED' && okey)
//           .filter(i => i)
//     )
//     .filter(i => i)
// };
