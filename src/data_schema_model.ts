import * as validations from './validation';

// @ts-ignore
import initCustomErrors from 'ajv-errors';
import Ajv from 'ajv';

import { getRoot, getPath, IAnyStateTreeNode } from 'mobx-state-tree';

import { JSONSchemaType, JSONSchema } from './json_schema';
import { safeEval } from './form_utils';
import { DataSet } from './form_store';

const defaultAjv = new Ajv({ allErrors: true, useDefaults: true });
// initCustomErrors(defaultAjv);

defaultAjv.addKeyword('validationExpression', {
  // type: 'string',]
  errors: true,
  validate: function v(
    this: any,
    schema: any,
    data: any,
    elementSchema: JSONSchema,
    elementPath: string,
    parentData: any
  ) {
    // console.log(arguments);
    // console.log(parentData);
    // console.log(schema);
    // console.log(data);
    // console.log(safeEval(parentData, schema, data));
    // console.log(elementPath);

    const result = safeEval(parentData, schema, data);
    if (!result) {
      // console.log(`Validation Error "${elementSchema.validationMessage}" at: ` + elementPath);

      (v as any).errors = [];
      (v as any).errors.push({
        keyword: 'validationExpression',
        dataPath: elementPath,
        message: elementSchema.validationMessage
          ? elementSchema.validationMessage
          : 'Value is invalid',
        params: {
          keyword: 'validationExpression'
        }
      });
    }
    return result;
  }
});

export type ListItem = {
  text: string;
  value: string;
};

type SchemaOptions = {
  parent?: Schema;
  required?: boolean;
  key?: string;
  ajv?: Ajv.Ajv;
};

export class Schema {
  // store: typeof FormStore.Type;
  parent: Schema;
  properties: { [index: string]: Schema };
  items: Schema;
  type: JSONSchemaType;
  default: any;
  required: boolean;
  readOnly: boolean;
  validationMessage: string;
  expression: string;
  enum: ListItem[];
  key: string;
  schema: JSONSchema;

  validator: Ajv.ValidateFunction;
  ajv: Ajv.Ajv;

  constructor(
    schema: JSONSchema,
    { parent = null, required = false, key = null, ajv = defaultAjv }: SchemaOptions = {}
  ) {
    this.parent = parent;
    this.schema = schema;
    this.expression = schema.expression;
    this.key = key;

    // we do not need validator for end nodes
    // these are always validated from the parent
    if (schema.properties) {
      this.ajv = ajv;
      this.validator = this.ajv.compile(schema);
    }

    this.init(schema, ['readOnly', 'type', 'required', 'default', 'validationMessage', 'enum']);

    if (required) {
      this.required = required;
    }

    if (schema.type === 'object') {
      this.properties = {};
      for (let key of Object.getOwnPropertyNames(schema.properties)) {
        this.properties[key] = new Schema(schema.properties[key] as JSONSchema, {
          parent: this,
          required: schema.required && schema.required.includes(key),
          key
        });
      }
    }

    if (schema.type === 'array') {
      this.items = new Schema(schema.items as JSONSchema, this);
    }
  }

  rootSchema() {
    let s: Schema = this;
    while (s.parent != null) {
      s = s.parent;
    }
    return s;
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

  defaultValue<T>(dataset: T = {} as T): T {
    // validator is set to assign default values
    this.validator(dataset);
    return dataset;
  }

  /* =========================================================
      Validations
     ======================================================== */

  static convertPath(path: string) {
    path = path.replace(/\/(\d+)/g, '[$1]');
    path = path.replace(/\//g, '.');

    return path;
  }

  static reassignErrors(errors: any[]) {
    if (!Array.isArray(errors)) {
      return errors;
    }
    for (let error of errors) {
      // missing properties are propagated into properties themselves
      // rendering as "value is required"
      if (error.params && error.params.missingProperty) {
        error.dataPath += '.' + error.params.missingProperty;
        error.message = 'Value is required';
      }
    }
    return errors;
  }

  static parseParent(dataPath: string) {
    if (dataPath.indexOf('.') >= 0) {
      return {
        dataPath: dataPath.substring(0, dataPath.lastIndexOf('.')),
        property: dataPath.substring(dataPath.lastIndexOf('.') + 1)
      };
    }
    return { property: dataPath, dataPath: '' };
  }

  tryParse(value: any) {
    switch (this.type) {
      case 'date':
        let date = Date.parse(value);
        return isNaN(date) ? value : new Date(date);
      case 'integer':
        return validations.IntValidator(value) ? value : parseInt(value, 10);
      case 'number':
        return validations.FloatValidator(value) ? value : parseFloat(value);
      case 'boolean':
        return value === true || value === 'true' || value === 'True'
          ? true
          : !value || value === false || value === 'false' || value === 'False'
          ? false
          : value;
      default:
        return value;
    }
  }

  assignErrors(dataset: DataSet, error: Ajv.ErrorObject) {
    let { property, dataPath } = Schema.parseParent(error.dataPath);
    const node = eval(`dataset${dataPath}`);

    if (!property) {
      property = 'ROOT';
    }

    if (!node.errors.get(property)) {
      node.errors.set(property, error.message);
    }
  }

  validate(dataset: DataSet) {
    const cleanData = dataset.toJS ? dataset.toJS() : dataset;
    // console.log(cleanData);

    // we use this when executing expressions
    // (this.ajv as any).currentData = cleanData;

    if (!this.validator(cleanData) as any) {
      return Schema.reassignErrors(this.validator.errors);
    }
    return false;
  }

  validateAndAssignErrors(dataset: DataSet) {
    const cleanData = dataset.toJS();
    const errors = this.validate(cleanData);
    if (errors && errors.length) {
      for (let error of errors) {
        this.assignErrors(dataset, error);
      }
    }
    return errors;
  }

  validateField(value: IAnyStateTreeNode, key: string, assignErrors = false) {
    // mobx's 'getPath' generates path such as /prop/path/0
    // we need to convert it to the json schema type path such as.prop.path[0]
    const path = Schema.convertPath(getPath(value)) + (key ? '.' + key : '');
    // console.log('Validating: ' + path);

    // validate the whole dataset from its root
    const root: DataSet = getRoot(value);
    const errors = this.validate(root as DataSet);

    // console.log(root.fatherAge)
    // console.log(errors);

    // locate the error in the resulting errors by its path
    if (errors && errors.length) {
      const error = errors.find(e => e.dataPath === path);
      if (error) {
        if (assignErrors) {
          this.assignErrors(root, error);
        }
        return error.message;
      }
    }
    return undefined;
  }
}
