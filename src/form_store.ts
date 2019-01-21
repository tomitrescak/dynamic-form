import { observable, toJS } from 'mobx';
import { types, getParent, getRoot } from 'mobx-state-tree';

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
          // set value for validation
          store[key] = value;

          // value is correct set the parsed value
          if (!this.validateValue(key)) {
            setValue(key, self.getSchema(key).parse(value));
          }
          // setValue(
          //   key,
          //   this.validateValue(key, value) || value === ''
          //     ? value
          //     : self.getSchema(key).parse(value)
          // );
        }
      },
      toJS() {
        return strip(toJS(self));
      },
      toJSString() {
        return JSON.stringify(this.toJS(), null, 2);
      },
      assignValidations(validations: any, dataset: any): string[] {
        let d = dataset as DataSet;
        let errors: string[] = [];

        for (let key of Object.getOwnPropertyNames(validations)) {
          let property = validations[key];

          // console.log(key);
          // console.log(property);
          // console.log(dataset.code);
          // console.log(d.errors);

          if (typeof property === 'object') {
            errors.push(...this.assignValidations(property, dataset[key]));
          } else if (property.type === 'array') {
            let data = dataset.getValue(key);
            for (let i = 0; i < data.length; i++) {
              errors.push(...this.assignValidations(property[i], data[i]));
            }
          } else {
            errors.push(key + ': ' + property);
            d.errors.set(key, property);
          }
        }
        return errors;
      },
      validateAll(assign = true): string[] {
        let validations = self.getSchema().validateDataset(self);
        let doobie = validations && (validations[0] || validations); // aybe in the future I will work will all validations

        if (doobie) {
          if (assign) {
            return this.assignValidations(doobie, self);
          }
          return doobie;
        }
        return undefined;
      },
      validate(key: string) {
        return this.validateValue(key); // , self.getValue(key));
      },
      validateValue(key: string) {
        console.log('===============');

        // get root and validate root
        let schema = self.getSchema(key);
        let path = [key];
        let root = getRoot(self);
        let validations = (root as any).validateAll(false);
        console.log(validations);
        let parent = schema.parent;
        while (parent && parent.key) {
          path.push(parent.key);
          parent = parent.parent;
        }
        console.log(path);

        // find the property in validation results
        let validation = validations;
        while (path.length && validation) {
          let key = path.pop();
          validation = validation[key];
          console.log(validation);
        }
        console.log(validation);

        // console.log(validation);
        // const error = self
        //   .getSchema(key)
        //   .validate(value === undefined ? self.getValue(key) : value, self);
        self.errors.set(key, validation || '');

        return validation;
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
