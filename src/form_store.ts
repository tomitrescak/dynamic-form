import { observable, toJS } from 'mobx';
import { types } from 'mobx-state-tree';

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

function strip(obj: any) {
  if (typeof obj === 'object') {
    if (obj.errors) {
      delete obj.errors;
      delete obj.history;
    }

    for (let key of Object.getOwnPropertyNames(obj)) {
      let item = obj[key];
      strip(item);
    }
  }

  if (Array.isArray(obj)) {
    for (let item of obj) {
      strip(item);
    }
  }
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

// const errors = observable.map({});

export const FormStore = types
  .model()
  .volatile(() => ({
    errors: observable.map({})
  }))
  .views(self => ({
    getValue(item: string): any {
      // allow dot notation for obtaining values
      if (item.indexOf('.') > 0) {
        let [first, ...rest] = item.split('.');
        return (self as any)[first].getValue(rest);
      }
      return (self as any)[item];
    },
    getError(item: string): string {
      if (item.indexOf('.') > 0) {
        let [first, ...rest] = item.split('.');
        return (self as any)[first].getError(rest);
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
        config.setDirty(true);
      }
    }

    return {
      addRow(key: string) {
        const data = self.getSchema(key).items.defaultValue();
        self.getValue(key).push(data);

        this.validate(key);
      },
      isRequired(key: string) {
        return self.getSchema(key).required;
      },
      parseValue(key: string, value: any) {
        return self.getSchema(key).parse(value);
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
          return (self as any)[first].setValue(rest, value);
        } else {
          setValue(
            key,
            this.validateValue(key, value) || value === ''
              ? value
              : self.getSchema(key).parse(value)
          );
        }
      },
      toJS() {
        return strip(toJS(self));
      },
      toJSString() {
        return JSON.stringify(this.toJS(), null, 2);
      },
      validateAll(): boolean {
        let schema = self.getSchema();
        let valid = true;
        for (let key of Object.getOwnPropertyNames(schema.properties)) {
          let property = schema.properties[key];

          if (property.type === 'object') {
            valid = valid && self.getValue(key).validateAll();
          } else if (property.type === 'array') {
            for (let item of self.getValue(key)) {
              valid = valid && !schema.items.validate(item);
            }
          } else {
            valid = valid && !this.validate(key);
          }
        }
        return valid;
      },
      validate(key: string) {
        return this.validateValue(key, self.getValue(key));
      },
      validateValue(key: string, value: string = null) {
        const error = self
          .getSchema(key)
          .validate(value === undefined ? self.getValue(key) : value, self);
        self.errors.set(key, error || '');

        return error;
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
