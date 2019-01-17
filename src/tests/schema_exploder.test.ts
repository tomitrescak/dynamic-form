import merge from 'deepmerge';

import { clone } from '@tomino/toolbelt';
import { JSONSchema } from '../json_schema';

type Parent = {
  node: JSONSchema;
  parent: Parent;
  key: string;
};

function explode(
  obj: JSONSchema,
  parent: Parent = { node: obj, parent: null, key: null }
): JSONSchema[] | JSONSchema {
  let g = 0;
  let items: JSONSchema[] = [obj];
  let itemsToRemove: number[] = [];

  // anyOf multiplies the schema
  if (obj.anyOf) {
    let items: JSONSchema[] = [];
    let { anyOf, ...rest } = obj;

    for (let a of obj.anyOf) {
      // console.log('Porcess');
      // console.log(obj);

      // create clone of the current one withouth the anyOf property
      let c = clone(rest);

      // merge with current addition in anyOf
      let merged = merge(c, a);

      // expand on others
      let exploded = explode(merged);
      if (Array.isArray(exploded)) {
        // console.log(merged);
        // console.log(exploded);
        items.push(...exploded);
      } else {
        items.push(exploded);
      }
    }
    return items;
  }

  // all of merges schemas together
  if (obj.allOf) {
    console.trace();
    let { allOf, ...rest } = obj;
    let items: JSONSchema[] = [rest];

    for (let allOfItem of obj.allOf) {
      let exploded = explode(allOfItem);
      let itemLength = items.length;
      for (let i = 0; i < itemLength; i++) {
        console.log(i);

        if (g++ > 6) {
          console.log('Errror');
          break;
        }

        let current = items[i];
        if (Array.isArray(exploded)) {
          //   // items.push(...exploded);
          for (let j = 0; j < exploded.length; j++) {
            let c = clone(current);
            //     // merge with current addition in anyOf
            let merged = merge(c, exploded[j]); /*?*/

            if (j === 0) {
              items[i] = merged;
            } else {
              items.push(merged);
            }
            // console.log(items);
          }
        } else {
          // merge with current

          // merge with current addition in anyOf
          console.log('Merging');
          console.log(exploded);

          items[i] = merge(current, exploded);
          // items.push(exploded);
        }
      }
    }
    return items;
  }

  // clone all exploded properties
  if (obj.type === 'object' && obj.properties) {
    // for (let j=0;)
    for (let key of Object.getOwnPropertyNames(obj.properties)) {
      let explodedProperties = explode(obj.properties[key], { node: obj, parent, key });

      if (Array.isArray(explodedProperties)) {
        // we will clone the parent

        let p = parent;
        let root = parent.node;
        let path: Parent[] = [];
        while (p.parent) {
          path.push(parent);
          root = p.parent.node;
          p = p.parent;
        }

        // remove root from collection
        const i = items.indexOf(root);
        items.splice(i, 1);

        // now insert each cloned version to the correct property
        for (let explodedProperty of explodedProperties) {
          // clone the parent and find the way back down
          let cloned: JSONSchema = clone(root);
          let child = cloned;
          let newParent: Parent = { node: cloned, key: null, parent: null };

          for (let i = path.length - 1; i >= 0; i--) {
            let top = path[i];
            child = child.properties[top.key];
            newParent = { node: child, key: top.key, parent: newParent };
          }
          child.properties[key] = explodedProperty;

          // console.log('Pushing');
          // console.log(explodedProperties);
          // console.log(child);

          let explodedClone = explode(child, { key, parent: newParent.parent, node: child });

          if (Array.isArray(explodedClone)) {
            items.push(...explodedClone);
          } else {
            items.push(explodedClone);
          }
        }

        return items;
      } else {
        obj.properties[key] = explodedProperties;
      }
    }
  }

  return items.length > 1 ? items : items[0];
}

// function showResult(obj) {
//   console.log(JSON.stringify(obj, null, 2))
// }

// console.log(JSON.stringify(explode(obj), null, 2));

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

  it('explodes simple anyOf', () => {
    const s = schema();
    s.anyOf = [{ required: ['first'] }, { required: ['second'] }];
    const exploded = explode(s);

    expect(exploded).toEqual([
      {
        properties: {
          first: { type: 'number' },
          second: { type: 'number' },
          third: { type: 'number' }
        },
        required: ['first'],
        type: 'object'
      },
      {
        properties: {
          first: { type: 'number' },
          second: { type: 'number' },
          third: { type: 'number' }
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
          third: { type: 'number' }
        },
        required: ['first'],
        type: 'object'
      },
      {
        properties: {
          first: { type: 'number' },
          second: { type: 'number' },
          third: { type: 'number' }
        },
        required: ['third'],
        type: 'object'
      },
      {
        properties: {
          first: { type: 'number' },
          second: { type: 'number' },
          third: { type: 'number' }
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

  fit('explodes deep properties', () => {
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
            }
          }
        }
      }
    };

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
});
