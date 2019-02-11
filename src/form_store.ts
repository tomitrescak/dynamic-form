import { observable, toJS } from 'mobx';
import { types, getRoot, getParent } from 'mobx-state-tree';
import Ajv from 'ajv';

import { Schema } from './data_schema_model';
import { config } from './config';

export type IValidator = (input: string) => string;

export type DataSet = typeof FormStore.Type;

export type ValidationResult = {
  required: number;
  requiredValid: number;
  valid: number;
  invalid: number;
  total: number;
};

function strip(obj: any, options: ToJsOptions) {
  // console.log(options);

  if (obj && typeof obj === 'object') {
    if (obj.errors) {
      delete obj.errors;
      delete obj.inversePatches;
      delete obj.history;
    }

    for (let key of Object.getOwnPropertyNames(obj)) {
      let item = obj[key];
      if (options.replaceDates && item instanceof Date) {
        obj[key] = item.toISOString();
      }
      if (item === '' || item === null) {
        if (options.replaceEmpty) {
          obj[key] = undefined;
        }
      } else if (typeof item === 'object') {
        strip(item, options);
      } else if (Array.isArray(item)) {
        for (let a of item) {
          strip(a, options);
        }
      }
    }
  }

  // if (Array.isArray(obj)) {
  //   for (let item of obj) {
  //     strip(item);
  //   }
  // }
  return obj;
}

// function clone(obj: any) {
//   if (obj === null || typeof obj !== 'object' || 'isActiveClone' in obj) {
//     return obj;
//   }

//   // @ts-ignore
//   let temp = obj instanceof Date ? new obj.constructor() : obj.constructor();

//   for (let key in obj) {
//     if (Object.prototype.hasOwnProperty.call(obj, key)) {
//       // tslint:disable-next-line:no-string-literal
//       obj.isActiveClone = null;
//       temp[key] = clone(obj[key]);
//       delete obj.isActiveClone;
//     }
//   }
//   return temp;
// }

export interface ListValue {
  [index: string]: string;
  text: string;
  value: string;
}

type ToJsOptions = { replaceEmpty?: boolean; replaceDates?: boolean };

// const errors = observable.map({});

export const FormStore = types
  .model()
  .volatile(() => ({
    errors: observable.map({})
  }))
  .views(self => ({
    getValue(item: string): any {
      if (!item) {
        return self;
      }
      // allow dot notation for obtaining values
      if (item.indexOf('.') > 0) {
        let [first, ...rest] = item.split('.');
        return (self as any)[first].getValue(rest.join('.'));
      }
      return (self as any)[item];
    },
    getError(item: string): string {
      if (item.indexOf('.') > 0) {
        let [first, ...rest] = item.split('.');
        return (self as any)[first].getError(rest.join('.'));
      }
      return self.errors.get(item);
    }
  }))
  .actions(() => ({
    getSchema(_key: string = null): Schema {
      throw new Error('Not implemented');
    }
  }))
  .actions(function(self) {
    const store: any = self;

    // const { defaultValue, validators, arrays, objects, descriptors } = self.privateHelpers();
    function setValue(key: string, value: any) {
      if (store[key] !== value) {
        store[key] = value;
        if (config.setDirty) {
          config.setDirty(true);
        }
      }
    }

    return {
      addRow(key: string) {
        const data = self.getSchema(key).items.defaultValue();
        self.getValue(key).push(data);

        this.validateField(key);
      },
      isRequired(key: string) {
        return self.getSchema(key).required;
      },
      parseValue(key: string, value: any) {
        return self.getSchema(key).tryParse(value);
      },
      removeRow(key: string, index: number) {
        store[key].splice(index);
      },
      removeRowData<T>(key: string, data: T) {
        store[key].remove(data);
      },
      removeRowIndex(key: string, index: number) {
        store[key].splice(index, 1);
      },
      setValue(key: string, value: any): void {
        if (key.indexOf('.') > 0) {
          let [first, ...rest] = key.split('.');
          return (self as any)[first].setValue(rest.join('.'), value);
        } else {
          // set value for validation
          setValue(key, self.getSchema(key).tryParse(value));

          // validate
          this.validateField(key);
        }
      },
      // clear all errors from the previous validation
      clearErrors() {
        self.errors.clear();
        const schema = self.getSchema();

        for (let key of Object.getOwnPropertyNames(schema.properties)) {
          let elem = schema.properties[key];
          if (elem.type === 'object') {
            self.getValue(key).clearErrors();
          }
          if (elem.type === 'array' && elem.items.type === 'object') {
            for (let row of self.getValue(key)) {
              row.clearErrors();
            }
          }
        }
      },
      toJS({ replaceDates = false, replaceEmpty = true }: ToJsOptions = {}) {
        return strip(toJS(self), { replaceDates, replaceEmpty });
      },
      toJSString() {
        return JSON.stringify(this.toJS(), null, 2);
      },
      root() {
        if (getRoot(self) == self) {
          return self;
        }
        let parent = getParent(self) as any;
        if (parent && parent.clearErrors) {
          return parent.root();
        }
        return self;
      },
      validateDataset(assign = true): false | Ajv.ErrorObject[] {
        const rootSchema = self.getSchema().rootSchema();

        // clear previous errors
        this.root().clearErrors();

        if (assign) {
          return rootSchema.validateAndAssignErrors(self as DataSet);
        } else {
          return rootSchema.validate(self as DataSet);
        }
      },
      validateField(key: string) {
        // find current schema
        let ownSchema = self.getSchema();
        let keys = [key];
        let field = ownSchema.properties[key];

        if (field.validationGroup) {
          // currently we support validation groups only on the same level
          for (let property of Object.getOwnPropertyNames(ownSchema.properties)) {
            if (
              key !== property &&
              ownSchema.properties[property].validationGroup === field.validationGroup
            ) {
              keys.push(property);
            }
          }
        }

        // remove error
        for (let k of keys) {
          self.errors.set(k, '');
        }

        // get root and validate root
        const schema = self.getSchema().rootSchema();

        // const value = (self as any)[key];
        return schema.validateFields(self, keys, true);
      }
    };
  });

// export const FormStore = types
//   .model({
//     errors: types.map(types.string)
//   })
//   .actions(self => ({
//     setItem(item: string, value: string): void {
//       (self as any)[item] = value;
//     },
//     getItem(item: string): string {
//       return (self as any)[item];
//     },
//     getError(item: string): string {
//       return self.errors.get(item);
//     }
//   }));
