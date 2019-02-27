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
    case 'array':
      return types.optional(
        types.array(types.optional(mstTypeFactory(desc.items), desc.items.defaultValue)),
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

  for (let key of properties) {
    let node = schema.properties[key];
    if (node.expression) {
      continue;
    }
    if (node.$ref) {
      continue;
    }
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
    .props(
      properties.reduce((previous: any, key: string) => {
        // handle references ($ref = '#' is a reference to self)
        // other references are currently unsupported
        let node = schema.properties[key];
        if (node.$ref) {
          if (node.$ref === '#') {
            previous[key] = types.union(types.late(() => mst), types.undefined, types.null);
          } else {
            throw new Error('We currently do not support internal references');
          }
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
