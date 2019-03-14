import {
  types,
  IAnyModelType,
  IModelType,
  ModelPropertiesDeclarationToProperties,
  ModelProperties
} from 'mobx-state-tree';
import { UndoManager } from 'mst-middlewares';

import { Schema } from './data_schema_model';
import { FormStore } from './form_store';
import { safeEval } from './form_utils';
import { JSONSchema } from './json_schema';
import { setUndoManager } from './undo_manager';

let time = Date.now();
let i = 0;
function shortId() {
  return (time + i++).toString();
}

const PropMap = types.map(
  types.union(types.string, types.number, types.boolean, types.late((): any => PropMap))
);

function mstTypeFactory(desc: Schema, mst: any, definitions: any): any {
  if (desc.$ref) {
    if (desc.$ref === '#') {
      return types.union(types.late(mst), types.undefined, types.null);
    } else {
      let match = desc.$ref.match(/#\/definitions\/(\S+)/);
      if (match) {
        let type = definitions[match[1]];
        if (type) {
          return type;
        } else {
          throw new Error('Could not find definition in your schema: ' + match[1]);
        }
      } else {
        throw new Error('We currently do not support internal references');
      }
    }
  }

  if (desc.expression) {
    return null;
  }

  switch (desc.type) {
    case 'array':
      return types.optional(
        types.array(
          types.optional(mstTypeFactory(desc.items, mst, definitions), desc.items.defaultValue)
        ),
        desc.default || []
      );
    case 'string':
      if (desc.format === 'date-time') {
        return types.optional(
          types.union(types.Date, types.string, types.undefined, types.null),
          desc.default || ''
        );
      }
      return types.optional(
        types.union(types.string, types.undefined, types.null),
        desc.default || ''
      );
    case 'integer':
      return types.optional(
        types.union(types.number, types.string, types.undefined, types.null),
        desc.default || ''
      );
    case 'number':
      return types.optional(
        types.union(types.number, types.string, types.undefined, types.null),
        desc.default || ''
      );
    case 'boolean':
      return types.optional(
        types.union(types.boolean, types.string, types.undefined, types.null),
        desc.default || ''
      );
    case 'object':
      if (!desc.properties) {
        return types.optional(PropMap, {});
      }
      return types.optional(buildTree(desc), {});
    case undefined:
      return types.string;
  }
  throw new Error('MST Type not supported: ' + desc.type);
}

function buildTree(schema: Schema, definitions: any = null, addUndo = false) {
  // prepare model and views

  /* =========================================================
    EXPRESSIONS
    ======================================================== */
  if (!schema.properties) {
    throw new Error('Schema does not contain any properties: ' + JSON.stringify(schema));
  }

  const properties = Object.getOwnPropertyNames(schema.properties);

  const viewDefinition = () => {
    const view = {};

    for (let key of properties) {
      let node = schema.properties[key];

      // console.log(key + ' ' + node.expression);
      // console.log(node.schema);

      // expressions do not need state tree entry they are evaluated automatically
      if (node.expression) {
        (view as any).__defineGetter__(key, function() {
          // @ts-ignore
          const result = safeEval(this, node.expression);
          if (isNaN(result)) {
            return '#ERROR#';
          }
          return result;
        });
      }
    }

    return view;
  };

  /* =========================================================
      MST Nodes
     ======================================================== */
  const mstDefinition: { [index: string]: any } = {};
  if (addUndo) {
    mstDefinition.history = types.optional(UndoManager, {} as any);
  }

  // build tre

  const mst = FormStore.named('FormStore')
    .props(mstDefinition)
    .props(
      properties.reduce((previous: any, key: string) => {
        let node = schema.properties[key];
        let definition = mstTypeFactory(node, () => mst, definitions);
        if (definition) {
          previous[key] = types.maybe(definition);
        }
        return previous;
      }, {})
    )
    .views(viewDefinition)
    .actions(() => ({
      getSchema(key: string) {
        if (!key) {
          return schema;
        }
        if (key.indexOf('.') >= 0) {
          const parts = key.split('.');
          let property = schema;
          do {
            const first = parts.shift();
            property = property.properties[first];
            if (!property) {
              throw new Error(
                `Could not find key '${first}' for key '${key}' in schema with properties [${Object.getOwnPropertyNames(
                  schema.properties
                ).join(',')}]`
              );
            }
          } while (parts.length > 0);
          return property;
        }

        const value = key ? schema.properties[key] : schema;
        if (!value) {
          throw new Error(
            `Could not find key '${key}' in schema with properties [${Object.getOwnPropertyNames(
              schema.properties
            ).join(',')}]`
          );
        }
        return value;
      }
    }));

  return mst;
}

type FT = typeof FormStore.Type;

function addDefinitions(external: { [index: string]: any }) {
  let result: { [index: string]: any } = {};
  if (external) {
    let definitionKeys = Object.getOwnPropertyNames(external);
    for (let key of definitionKeys) {
      result[key] = buildTree(external[key] as any);
    }
  }
  return result;
}

export function buildStore<T = {}>(
  schema: Schema | JSONSchema,
  externalDefinitions: { [index: string]: JSONSchema } = {}
): IModelType<{}, Readonly<T> & FT> {
  if (externalDefinitions) {
    schema.definitions = { ...(schema.definitions || {}), ...(externalDefinitions as any) };
  }
  if (!(schema instanceof Schema)) {
    schema = new Schema(schema);
  }
  // prepare internal definitions
  let definitions: { [index: string]: any } = addDefinitions(schema.definitions);

  // prepare model and views
  return buildTree(schema, definitions, true) as IModelType<{}, Readonly<T> & FT>;
}

export function buildDataSet<T = {}>(
  schema: JSONSchema,
  data: Partial<T> = {},
  allowUndo = false
): FT & T {
  let dataSet = buildStore<T>(new Schema(schema)).create(data);
  if (allowUndo) {
    setUndoManager(dataSet);
  }
  return dataSet as FT & T;
}
