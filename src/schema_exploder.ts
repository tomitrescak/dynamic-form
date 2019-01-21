import merge from 'deepmerge';

import { clone } from '@tomino/toolbelt';
import { JSONSchema } from './json_schema';

type Parent = {
  node: JSONSchema;
  parent: Parent;
  key: string;
};

let idx = 0;
function createParent(key: string, node: JSONSchema, parent: Parent) {
  return {
    idx: idx++,
    node,
    parent,
    key
  };
}

function addToArray(element: JSONSchema | JSONSchema[], array: JSONSchema[]) {
  if (Array.isArray(element)) {
    array.push(...element);
  } else {
    array.push(element);
  }
}

let exploded = false;
export function didExplode(value: boolean) {
  if (value != null) {
    exploded = value;
  }
  return exploded;
}

export function expandSchemas(obj: JSONSchema) {
  exploded = false;
  let schemas = explode(obj);
  return { exploded, schemas };
}

export function explode(obj: JSONSchema, parent: Parent = null): JSONSchema[] {
  if (!parent) {
    parent = createParent(null, obj, null);
  }

  if (obj.oneOf) {
    throw new Error('oneOf is currently not supported');
  }

  // anyOf multiplies the schema
  if (obj.anyOf) {
    exploded = true;
    let anyOfItems: JSONSchema[] = [];
    let { anyOf, ...rest } = obj;

    for (let a of obj.anyOf) {
      // create clone of the current one withouth the anyOf property
      let c = clone(rest);

      // merge with current addition in anyOf
      let merged = merge(c, a);

      // expand on others
      let exploded = explode(merged);
      addToArray(exploded, anyOfItems);
    }

    return anyOfItems;
  }

  // all of merges schemas together
  if (obj.allOf) {
    exploded = true;
    let { allOf, ...rest } = obj;
    let allOfItems: JSONSchema[] = [];

    for (let allOfItem of obj.allOf) {
      let c = clone(rest);

      // merge with current and continue explosion expanding on other properties
      let merged = merge(c, allOfItem);
      let exploded = explode(merged);

      if (allOfItems.length === 0) {
        addToArray(exploded, allOfItems);
      } else {
        // explosion multiplies all array elements
        let multiplied = [];
        for (let currentItem of allOfItems) {
          for (let newItem of exploded as any) {
            multiplied.push(merge(currentItem, newItem));
          }
        }
        allOfItems = multiplied;
      }
    }
    return allOfItems;
  }

  /* =========================================================
      PROPERTIES
     ======================================================== */

  if (obj.type === 'object' && obj.properties) {
    return processProperties(obj, parent);
  }

  if (obj.type === 'array' && (obj.items as JSONSchema).properties) {
    // let m = explode(obj.items as JSONSchema, parent); /*?*/
    return explode(obj.items as JSONSchema, parent).map(r => ({ ...obj, items: r }));
  }

  return [obj];
}

function findParent(parent: Parent) {
  let p = parent;
  let root = parent.node;
  let path: Parent[] = [];
  while (p.parent) {
    path.push(p);
    root = p.parent.node;
    p = p.parent;
  }

  return { root, path };
}

function findChild(root: any, path: Parent[]) {
  let cloned: JSONSchema = clone(root);
  let child = cloned;
  let newParent: Parent = createParent(null, cloned, null);

  for (let i = path.length - 1; i >= 0; i--) {
    let top = path[i];
    newParent = createParent(top.key, child, newParent);
    child = child.properties[top.key];
  }
  return { newParent, child };
}

function processProperties(obj: any, parent: any) {
  let items: JSONSchema[] = [obj];

  // for (let j=0;)
  for (let key of Object.getOwnPropertyNames(obj.properties)) {
    // explode property, if the property is exploded return array with more then 1 item
    // if this is the case we need to multiply the containing object by finding its root
    // cloning it and assigning the new property where it
    let explodedProperties = explode(obj.properties[key], createParent(key, obj, parent));

    if (explodedProperties.length > 1) {
      // find the root schema and remember the path
      // from the path we can reconstruct the object
      let { root, path } = findParent(parent);

      // remove root from collection
      const i = items.indexOf(root);
      items.splice(i, 1);

      // now insert each cloned version to the correct property
      for (let explodedProperty of explodedProperties) {
        // clone the parent and find the way back down
        // following the path, back to the current property
        let { child, newParent } = findChild(root, path);

        // override the property with current value
        child.properties[key] = explodedProperty;

        // continue processing other properties in case more of them have multipliers
        items.push(...processProperties(child, newParent));
      }
      return items;
    } else {
      obj.properties[key] = explodedProperties[0];
    }
  }
  return items;
}
