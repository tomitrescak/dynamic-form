import { explode } from '../schema_exploder';
import { JSONSchema } from '../json_schema';
import { m } from '../validation';

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

  // it('explodes single property schema', () => {
  //   const jsonSchema: JSONSchema = {
  //     type: 'object',
  //     properties: {
  //       code: {
  //         type: 'string',
  //         anyOf: [{ maxLength: 3 }, { minLength: 10 }]
  //       }
  //     }
  //   };
  //   const exploded = explode(jsonSchema); /*?*/
  //   expect(exploded).toEqual([
  //     {
  //       properties: { code: { maxLength: 3, type: 'string' } },
  //       type: 'object'
  //     },
  //     {
  //       properties: { code: { minLength: 10, type: 'string' } },
  //       type: 'object'
  //     }
  //   ]);
  // });

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

  it('explodes schema with array values', () => {
    const s: JSONSchema = {
      type: 'object',
      properties: {
        arr: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              foo: { type: 'string' },
              boo: { type: 'string' }
            },
            anyOf: [{ required: ['foo'] }, { required: ['boo'] }]
          }
        }
      }
    };
    const exploded = explode(s);
    expect(exploded).toEqual([
      {
        properties: {
          arr: {
            items: {
              properties: { boo: { type: 'string' }, foo: { type: 'string' } },
              required: ['foo'],
              type: 'object'
            },
            type: 'array'
          }
        },
        type: 'object'
      },
      {
        properties: {
          arr: {
            items: {
              properties: { boo: { type: 'string' }, foo: { type: 'string' } },
              required: ['boo'],
              type: 'object'
            },
            type: 'array'
          }
        },
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
