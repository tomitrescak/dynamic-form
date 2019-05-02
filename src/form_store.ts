import { observable, toJS } from 'mobx';
import { types, getRoot, getParent, detach, IMSTMap } from 'mobx-state-tree';
import Ajv from 'ajv';

import { Schema } from './data_schema_model';
import { config } from './config';

export type IValidator = (input: string) => string;

export type DataSet<T = {}> = typeof FormStore.Type &
  Readonly<T> & {
    parent: DataSet<T>;
  };

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

function getValue(item: any, key: string) {
  if (item.get) {
    return item.get(key);
  }
  return item.getValue(key);
}

function setValue(item: any, key: string, value: any) {
  if (item.set) {
    return item.set(key, value);
  }
  return item.setValue(key, value);
}

export const FormStore = types
  .model()
  .volatile(() => ({
    errors: observable.map({})
  }))
  .views(self => ({
    /** Return an object parent */
    get parent(): DataSet {
      try {
        let level = 1;
        let parent = null;
        do {
          parent = getParent<DataSet>(self, level++);
          if (
            parent &&
            parent.constructor &&
            (parent.constructor.name === 'object' || parent.constructor.name === 'Object')
          ) {
            return parent;
          }
        } while (parent != null);
      } catch {}
      return null;
    },
    /** Return immediate parent (getParent(1)) */
    get immediateParent(): DataSet {
      try {
        return getParent<DataSet>(self, 1);
      } catch {}
      return null;
    },
    getValue(item: string): any {
      if (!item) {
        return self;
      }
      let s: any = self;
      // allow dot notation for obtaining values
      if (item.indexOf('.') > 0) {
        let [first, ...rest] = item.split('.');
        if (Array.isArray(s[first])) {
          return rest.length > 1
            ? getValue(s[first][parseInt(rest[0])], rest.slice(1).join('.'))
            : s[first][parseInt(rest[0])];
        }
        return getValue(s[first], rest.join('.'));
      }
      return s[item];
    },
    getError(item: string): string {
      let s: any = self;
      if (item.indexOf('.') > 0) {
        let [first, ...rest] = item.split('.');
        if (Array.isArray(s[first])) {
          return s[first][parseInt(rest[0])].getError(rest.slice(1).join('.'));
        }
        return s[first].getError(rest.join('.'));
      }
      return self.errors.get(item);
    },
    setError(item: string, error: string): void {
      let s: any = self;
      if (item.indexOf('.') > 0) {
        let [first, ...rest] = item.split('.');
        if (Array.isArray(s[first])) {
          s[first][parseInt(rest[0])].setError(rest.slice(1).join('.'));
        }
        s[first].setError(rest.join('.'));
      }
      self.errors.set(item, error);
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
      addRow(key: string, data?: any) {
        data = data || self.getSchema(key).items.defaultValue();
        self.getValue(key).push(data);

        this.validateField(key);
      },
      mapRemove(key: string, mapKey: string) {
        self.getValue(key).delete(mapKey);
      },
      detach(node: any) {
        detach(node);
      },
      isRequired(key: string) {
        return self.getSchema(key).required;
      },
      parseValue(key: string, value: any) {
        return self.getSchema(key).tryParse(value);
      },
      insertRow<T>(key: string, index: number, data: T) {
        store[key].splice(index, 0, data);
        return store[key][index];
      },
      replaceRow<T>(key: string, index: number, data: T) {
        store[key][index] = data;
        return store[key][index];
      },
      removeRow(key: string, index: number) {
        store[key].splice(index, 1);
      },
      removeRowData<T>(key: string, data: T) {
        store[key].remove(data);
      },
      removeRowIndex(key: string, index: number) {
        store[key].splice(index, 1);
      },
      executeAction<T>(action: (owner?: T) => any): any {
        action(self as any);
      },
      dataSetAction<T>(action: (owner?: T) => any) {
        return () => action(self as any);
      },
      setValue<T>(
        key: string,
        value: any,
        validate: (owner: T, args: { value: any; source: string }) => undefined | any = null
      ): void {
        if (key.indexOf('.') > 0) {
          let [first, ...rest] = key.split('.');
          return (self as any)[first].setValue(rest.join('.'), value);
        } else {
          // set value for validation
          setValue(key, self.getSchema(key).tryParse(value));

          // if there is validation function perform it
          //  if function returns value, set error
          //  if function return undefined, it is probably async function and do nothing
          //  if function return anything else continue validation with json schema
          if (validate) {
            let error = validate(self as any, { value, source: key });
            if (error) {
              self.setError(key, error);
            } else if (error !== undefined) {
              this.validateField(key);
            }
          } else {
            this.validateField(key);
          }
        }
      },
      setMapValue(key: string, mapKey: string, value: any) {
        self.getValue(key).set(mapKey, value);

        this.validateField(key);
      },
      setArrayValue(key: string, index: number, value: any) {
        self.getValue(key)[index] = value;

        this.validateField(key);
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
        return getRoot<DataSet>(self);
        // if (getRoot(self) == self) {
        //   return self;
        // }
        // let parent = getParent(self) as any;
        // if (parent && parent.clearErrors) {
        //   return parent.root();
        // }
        // return self;
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
