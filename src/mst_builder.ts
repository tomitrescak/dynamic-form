import { types } from 'mobx-state-tree';
import { UndoManager } from 'mst-middlewares';

import { Schema } from './data_schema_model';
import { FormStore } from './form_store';
import { safeEval } from './form_utils';

let time = Date.now();
let i = 0;
function shortId() {
  return (time + i++).toString();
}

function mstTypeFactory(desc: Schema): any {
  switch (desc.type) {
    case 'id':
      return types.optional(types.identifier, shortId);
    case 'expression':
      return undefined;
    case 'array':
      return types.optional(
        types.array(types.optional(mstTypeFactory(desc.items), desc.items.defaultValue)),
        desc.default || []
      );
    case 'string':
      return types.optional(types.union(types.string, types.undefined), desc.default || '');
    case 'integer':
      return types.optional(
        types.union(types.number, types.string, types.undefined),
        desc.default || ''
      );
    case 'number':
      return types.optional(
        types.union(types.number, types.string, types.undefined),
        desc.default || ''
      );
    case 'date':
      return types.optional(
        types.union(types.Date, types.string, types.undefined),
        desc.default || ''
      );
    case 'boolean':
      return types.optional(
        types.union(types.boolean, types.string, types.undefined),
        desc.default || ''
      );
    case 'object':
      return types.optional(buildStore(desc), {});
    case undefined:
      return types.string;
  }
  throw new Error('MST Type not supported: ' + desc.type);
}

export function buildStore(schema: Schema) {
  // prepare model and views

  const mstDefinition: { [index: string]: any } = {};

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
      // expressions do not need state tree entry they are evaluated automatically
      if (node.type === 'expression') {
        (view as any).__defineGetter__(key, function() {
          // @ts-ignore
          return safeEval(this, node.default);
        });
      }
    }

    return view;
  };

  /* =========================================================
      MST Nodes
     ======================================================== */

  for (let key of properties) {
    let node = schema.properties[key];
    let definition = mstTypeFactory(node);
    if (definition) {
      mstDefinition[key] = types.maybe(definition);
    }
  }

  if (schema.parent == null) {
    mstDefinition.history = types.optional(UndoManager, {});
  }

  // build tree
  const mst = FormStore.named('FormStore')
    .props(mstDefinition)
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
                `Could not find key ${first} for key ${key} in schema with properties [${Object.getOwnPropertyNames(
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
            `Could not find key ${key} in schema with properties [${Object.getOwnPropertyNames(
              schema.properties
            ).join(',')}]`
          );
        }
        return value;
      }
    }));

  return mst;
}
