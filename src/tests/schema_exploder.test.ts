import merge from 'deepmerge';

import { clone } from '@tomino/toolbelt';
import { JSONSchema } from '../json_schema';

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

function explode(obj: JSONSchema, parent: Parent = null, forceArray = false): JSONSchema[] {
  if (!parent) {
    parent = createParent(null, obj, null);
  }

  // anyOf multiplies the schema
  if (obj.anyOf) {
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
    let { allOf, ...rest } = obj;
    let allOfItems: JSONSchema[] = [];

    for (let allOfItem of obj.allOf) {
      let c = clone(rest);

      // merge with current and continue explosion expanding on other properties
      let merged = merge(c, allOfItem);
      let exploded = explode(merged, null, true); /*?*/

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
    let explodedProperties = explode(obj.properties[key], createParent(key, obj, parent)); /*?*/

    if (explodedProperties.length > 1) {
      // find the root schema and remember the path
      // from the path we can reconstruct the object
      let { root, path } = findParent(parent); /*?.root*/

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

describe('exploder', () => {
  function schema(): JSONSchema {
    return {
      type: 'object',
      properties: {
        first: { type: 'number' },
        second: { type: 'number' },
        third: { type: 'number' },
        fourth: { type: 'number' }
      }
    };
  }

  it('explodes simple anyOf an a property', () => {
    const s = schema();
    s.anyOf = [{ required: ['first'] }, { required: ['second'] }];
    s.properties.first.anyOf = [{ minimum: 0 }, { maximum: 1000 }];

    const exploded = explode(s);

    expect(exploded).toEqual([
      {
        properties: {
          first: { minimum: 0, type: 'number' },
          fourth: { type: 'number' },
          second: { type: 'number' },
          third: { type: 'number' }
        },
        required: ['first'],
        type: 'object'
      },
      {
        properties: {
          first: { maximum: 1000, type: 'number' },
          fourth: { type: 'number' },
          second: { type: 'number' },
          third: { type: 'number' }
        },
        required: ['first'],
        type: 'object'
      },
      {
        properties: {
          first: { minimum: 0, type: 'number' },
          fourth: { type: 'number' },
          second: { type: 'number' },
          third: { type: 'number' }
        },
        required: ['second'],
        type: 'object'
      },
      {
        properties: {
          first: { maximum: 1000, type: 'number' },
          fourth: { type: 'number' },
          second: { type: 'number' },
          third: { type: 'number' }
        },
        required: ['second'],
        type: 'object'
      }
    ]);
  });

  it('explodes simple anyOf', () => {
    const s = schema();
    s.anyOf = [{ required: ['first'] }, { required: ['second'] }];
    const exploded = explode(s);

    expect(exploded).toEqual([
      {
        properties: {
          first: { type: 'number' },
          second: { type: 'number' },
          third: { type: 'number' },
          fourth: { type: 'number' }
        },
        required: ['first'],
        type: 'object'
      },
      {
        properties: {
          first: { type: 'number' },
          second: { type: 'number' },
          third: { type: 'number' },
          fourth: { type: 'number' }
        },
        required: ['second'],
        type: 'object'
      }
    ]);
  });

  it('explodes nested anyOf', () => {
    const s = schema();
    s.anyOf = [
      { anyOf: [{ required: ['first'] }, { required: ['third'] }] },
      { required: ['second'] }
    ];
    const exploded = explode(s);
    console.log(JSON.stringify(exploded, null, 2));

    expect(exploded).toEqual([
      {
        properties: {
          first: { type: 'number' },
          second: { type: 'number' },
          third: { type: 'number' },
          fourth: { type: 'number' }
        },
        required: ['first'],
        type: 'object'
      },
      {
        properties: {
          first: { type: 'number' },
          second: { type: 'number' },
          third: { type: 'number' },
          fourth: { type: 'number' }
        },
        required: ['third'],
        type: 'object'
      },
      {
        properties: {
          first: { type: 'number' },
          second: { type: 'number' },
          third: { type: 'number' },
          fourth: { type: 'number' }
        },
        required: ['second'],
        type: 'object'
      }
    ]);
  });

  it('explodes simple allOf', () => {
    const s = schema();
    s.allOf = [{ required: ['first'] }, { required: ['second'] }, { required: ['fourth'] }];
    const exploded = explode(s);

    expect(exploded).toEqual([
      {
        properties: {
          first: { type: 'number' },
          second: { type: 'number' },
          third: { type: 'number' },
          fourth: { type: 'number' }
        },
        required: ['first', 'second', 'fourth'],
        type: 'object'
      }
    ]);
  });

  it('explodes simple allOf', () => {
    const s = schema();
    s.allOf = [
      { required: ['first'] },
      { anyOf: [{ required: ['second'] }, { required: ['third'] }] },
      { required: ['fourth'] }
    ];
    const exploded = explode(s);

    expect(exploded).toEqual([
      {
        properties: {
          first: { type: 'number' },
          fourth: { type: 'number' },
          second: { type: 'number' },
          third: { type: 'number' }
        },
        required: ['first', 'second', 'fourth'],
        type: 'object'
      },
      {
        properties: {
          first: { type: 'number' },
          fourth: { type: 'number' },
          second: { type: 'number' },
          third: { type: 'number' }
        },
        required: ['first', 'third', 'fourth'],
        type: 'object'
      }
    ]);
  });

  it('explodes combined allOf an a property', () => {
    const s = schema();
    s.allOf = [
      { required: ['first'] },
      { required: ['second'] },
      { anyOf: [{ required: ['third'] }, { required: ['fourth'] }] }
    ];
    s.properties.second.allOf = [{ minimum: 0 }, { maximum: 1000 }];

    const exploded = explode(s);

    expect(exploded).toEqual([
      {
        properties: {
          first: { type: 'number' },
          fourth: { type: 'number' },
          second: {
            maximum: 1000,
            minimum: 0,
            type: 'number'
          },
          third: { type: 'number' }
        },
        required: ['first', 'second', 'third'],
        type: 'object'
      },
      {
        properties: {
          first: { type: 'number' },
          fourth: { type: 'number' },
          second: {
            maximum: 1000,
            minimum: 0,
            type: 'number'
          },
          third: { type: 'number' }
        },
        required: ['first', 'second', 'fourth'],
        type: 'object'
      }
    ]);
  });

  it('explodes multiple properties', () => {
    const s = schema();
    // s.allOf = [
    //   { required: ['first'] },
    //   { anyOf: [{ required: ['second'] }, { required: ['third'] }] },
    //   { required: ['fourth'] }
    // ];
    s.properties.first.anyOf = [{ minimum: 2 }, { maximum: 10 }];
    s.properties.third.anyOf = [{ minimum: 0 }, { maximum: 1 }];
    const exploded = explode(s);

    expect(exploded).toEqual([
      {
        properties: {
          first: { minimum: 2, type: 'number' },
          fourth: { type: 'number' },
          second: { type: 'number' },
          third: { minimum: 0, type: 'number' }
        },
        type: 'object'
      },
      {
        properties: {
          first: { minimum: 2, type: 'number' },
          fourth: { type: 'number' },
          second: { type: 'number' },
          third: { maximum: 1, type: 'number' }
        },
        type: 'object'
      },
      {
        properties: {
          first: { maximum: 10, type: 'number' },
          fourth: { type: 'number' },
          second: { type: 'number' },
          third: { minimum: 0, type: 'number' }
        },
        type: 'object'
      },
      {
        properties: {
          first: { maximum: 10, type: 'number' },
          fourth: { type: 'number' },
          second: { type: 'number' },
          third: { maximum: 1, type: 'number' }
        },
        type: 'object'
      }
    ]);
  });

  it('explodes combination of multiple properties', () => {
    const s = schema();
    // s.allOf = [
    //   { required: ['first'] },
    //   { anyOf: [{ required: ['second'] }, { required: ['third'] }] },
    //   { required: ['fourth'] }
    // ];
    s.properties.first.anyOf = [{ minimum: 2 }, { maximum: 10 }];
    s.properties.third.allOf = [{ minimum: 0 }, { maximum: 1 }];

    const exploded = explode(s);

    expect(exploded).toEqual([
      {
        properties: {
          first: { minimum: 2, type: 'number' },
          fourth: { type: 'number' },
          second: { type: 'number' },
          third: { maximum: 1, minimum: 0, type: 'number' }
        },
        type: 'object'
      },
      {
        properties: {
          first: { maximum: 10, type: 'number' },
          fourth: { type: 'number' },
          second: { type: 'number' },
          third: { maximum: 1, minimum: 0, type: 'number' }
        },
        type: 'object'
      }
    ]);
  });

  it('explodes deep properties', () => {
    const s: JSONSchema = {
      type: 'object',
      properties: {
        first: {
          type: 'object',
          properties: {
            second: {
              type: 'object',
              properties: {
                third: {
                  type: 'number',
                  anyOf: [{ minimum: 2 }, { maximum: 2 }]
                }
              }
            },
            fourth: {
              type: 'number',
              anyOf: [{ minimum: 2, maximum: 3 }, { minimum: 0 }, { maximum: 1000 }]
            }
          }
        }
      }
    };

    const exploded = explode(s);

    expect(exploded).toEqual([
      {
        properties: {
          first: {
            properties: {
              fourth: { maximum: 3, minimum: 2, type: 'number' },
              second: { properties: { third: { minimum: 2, type: 'number' } }, type: 'object' }
            },
            type: 'object'
          }
        },
        type: 'object'
      },
      {
        properties: {
          first: {
            properties: {
              fourth: { minimum: 0, type: 'number' },
              second: { properties: { third: { minimum: 2, type: 'number' } }, type: 'object' }
            },
            type: 'object'
          }
        },
        type: 'object'
      },
      {
        properties: {
          first: {
            properties: {
              fourth: { maximum: 1000, type: 'number' },
              second: { properties: { third: { minimum: 2, type: 'number' } }, type: 'object' }
            },
            type: 'object'
          }
        },
        type: 'object'
      },
      {
        properties: {
          first: {
            properties: {
              fourth: { maximum: 3, minimum: 2, type: 'number' },
              second: { properties: { third: { maximum: 2, type: 'number' } }, type: 'object' }
            },
            type: 'object'
          }
        },
        type: 'object'
      },
      {
        properties: {
          first: {
            properties: {
              fourth: { minimum: 0, type: 'number' },
              second: { properties: { third: { maximum: 2, type: 'number' } }, type: 'object' }
            },
            type: 'object'
          }
        },
        type: 'object'
      },
      {
        properties: {
          first: {
            properties: {
              fourth: { maximum: 1000, type: 'number' },
              second: { properties: { third: { maximum: 2, type: 'number' } }, type: 'object' }
            },
            type: 'object'
          }
        },
        type: 'object'
      }
    ]);
  });
});
