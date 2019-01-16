import { JSONSchema } from '../json_schema';
import { Schema } from '../data_schema_model';

describe('Schema', () => {
  function createBaseSchema(): JSONSchema {
    return {
      type: 'object',
      properties: {
        first: {
          type: 'boolean'
        },
        second: {
          type: 'boolean'
        },
        requiredString: {
          type: 'string'
        },
        notRequiredString: {
          type: 'string'
        },
        integer: {
          type: 'integer'
        },
        complex: {
          type: 'object',
          properties: {
            max5: {
              type: 'number'
            }
          }
        }
      }
    };
  }

  describe('validateWithReport', () => {
    it('validates required value', () => {
      const schemaDef = createBaseSchema();
      schemaDef.required = ['first'];

      const schema = new Schema(schemaDef);
      const result = schema.validateAll({});

      expect(result).toEqual({ first: 'REQUIRED' });
      expect(schema.interpretResults(result)).toEqual({ first: 'REQUIRED' });
    });

    it('valid schema returns undefined', () => {
      const schemaDef = createBaseSchema();
      const schema = new Schema(schemaDef);
      const result = schema.validateAll({});
      expect(result).toBeUndefined();
      expect(schema.interpretResults(result)).toBeUndefined();
    });

    it('validates anyOf value', () => {
      // ====================================
      // if all are false it is an error
      // one value

      let result = null;
      let schemaDef = createBaseSchema();
      schemaDef.anyOf = [{ required: ['first'] }];

      let schema = new Schema(schemaDef);
      expect(schema.validateAll({})).toEqual({
        VALIDATION: [{ anyOf: [{ first: 'REQUIRED' }] }]
      });
      expect(schema.validateAll({ first: true })).toBeUndefined();

      // two values

      schemaDef = createBaseSchema();
      schemaDef.anyOf = [{ required: ['first'] }, { required: ['second'] }];

      schema = new Schema(schemaDef);
      expect(schema.validateAll({ first: true })).toBeUndefined();
      expect(schema.validateAll({ second: true })).toBeUndefined();
      result = schema.validateAll({});

      expect(result).toEqual({
        VALIDATION: [{ anyOf: [{ first: 'REQUIRED' }, { second: 'REQUIRED' }] }]
      });
      expect(schema.interpretResults(result)).toEqual({
        first: { anyOf: ['REQUIRED'] },
        second: { anyOf: ['REQUIRED'] }
      });
    });

    describe('interpret results', () => {
      it('anyOf required', () => {
        let schemaDef = createBaseSchema();
        schemaDef.anyOf = [{ required: ['first'] }, { required: ['second'] }];

        let schema = new Schema(schemaDef);
        let result = schema.validateAll({});

        // VALIDATION: [{ anyOf: [{ first: 'REQUIRED' }, { second: 'REQUIRED' }] }]

        expect(schema.interpretResults(result)).toEqual({
          first: { anyOf: ['REQUIRED'] },
          second: { anyOf: ['REQUIRED'] }
        });
      });

      it('anyOf number', () => {
        let schemaDef = createBaseSchema();
        schemaDef.properties.integer.anyOf = [{ minimum: 10 }, { maximum: 0 }];

        let schema = new Schema(schemaDef);
        let result = schema.validateAll({ integer: 5 });

        // VALIDATION: [{ anyOf: [{ first: 'REQUIRED' }, { second: 'REQUIRED' }] }]

        expect(schema.interpretResults(result)).toEqual({
          integer: {
            anyOf: [
              'Value has to be higher or equal than 10',
              'Value has to be lower or equal than 0'
            ]
          }
        });
      });
    });

    fit('validates combined value', () => {
      // ====================================
      // if all are false it is an error
      // one value

      let result = null;
      let schemaDef = createBaseSchema();

      schemaDef.allOf = [
        { required: ['integer'] },
        { anyOf: [{ required: ['first'] }, { required: ['second'] }] }
      ];

      let schema = new Schema(schemaDef);
      expect(schema.validateAll({ first: true })).toEqual({
        VALIDATION: [{ allOf: [{ integer: 'REQUIRED' }] }]
      });
      result = schema.validateAll({});
      expect(result).toEqual({
        VALIDATION: [
          {
            allOf: [
              { integer: 'REQUIRED' },
              { VALIDATION: [{ anyOf: [{ first: 'REQUIRED' }, { second: 'REQUIRED' }] }] }
            ]
          }
        ]
      });
      expect(schema.interpretResults(result)).toEqual({})
    });

    it('validates anyOf number value', () => {
      // if all are false it is an error
      // one value

      let schemaDef = createBaseSchema();
      schemaDef.properties.integer.minimum = 10;

      let schema = new Schema(schemaDef);

      const result = schema.validateAll({ integer: 5 });
      expect(result).toEqual({
        integer: 'Value has to be higher or equal than 10'
      });
      expect(schema.interpretResults(result)).toEqual({
        integer: 'Value has to be higher or equal than 10'
      });
      expect(schema.validateAll({ integer: 10 })).toBeUndefined();
    });

    it('validates anyOf internal number value', () => {
      // if all are false it is an error
      // one value

      let schemaDef = createBaseSchema();
      schemaDef.properties.complex.properties.max5.maximum = 5;

      let schema = new Schema(schemaDef);

      let result = schema.validateAll({ complex: { max5: 15 } });
      expect(result).toEqual({
        complex: { max5: 'Value has to be lower or equal than 5' }
      });
      expect(schema.interpretResults(result)).toEqual({
        complex: { max5: 'Value has to be lower or equal than 5' }
      });
      expect(schema.validateAll({ complex: { max5: 0 } })).toBeUndefined();
    });

    it('validates anyOf number value', () => {
      // if all are false it is an error
      // one value

      let schemaDef = createBaseSchema();
      schemaDef.properties.integer.anyOf = [{ minimum: 10 }, { maximum: 0 }];

      let schema = new Schema(schemaDef);

      expect(schema.validateAll({ integer: 5 })).toEqual({
        integer: {
          VALIDATION: [
            {
              anyOf: [
                'Value has to be higher or equal than 10',
                'Value has to be lower or equal than 0'
              ]
            }
          ]
        }
      });

      expect(schema.validateAll({ integer: 15 })).toBeUndefined();
    });

    it('validates allOf number value', () => {
      // if all are false it is an error
      // one value

      let schemaDef = createBaseSchema();
      schemaDef.properties.integer.allOf = [{ minimum: 10 }, { maximum: 0 }];

      let schema = new Schema(schemaDef);

      let result = schema.validateAll({ integer: 5 });
      expect(result).toEqual({
        integer: {
          VALIDATION: [
            {
              allOf: [
                'Value has to be higher or equal than 10',
                'Value has to be lower or equal than 0'
              ]
            }
          ]
        }
      });
      expect(schema.interpretResults(result)).toEqual({
        integer: {
          allOf: [
            'Value has to be higher or equal than 10',
            'Value has to be lower or equal than 0'
          ]
        }
      });

      result = schema.validateAll({ integer: 15 });
      expect(result).toEqual({
        integer: { VALIDATION: [{ allOf: ['Value has to be lower or equal than 0'] }] }
      });
      expect(schema.interpretResults(result)).toEqual({
        integer: {
          allOf: ['Value has to be lower or equal than 0']
        }
      });
    });

    fit('validates allOf value', () => {
      // ====================================
      // if all are false it is an error
      // one value

      let schemaDef = createBaseSchema();
      schemaDef.allOf = [{ required: ['first'] }];
      schemaDef.properties.integer.minimum = 5;

      let schema = new Schema(schemaDef);
      expect(schema.validateAll({ integer: 2 })).toEqual({
        VALIDATION: [
          { allOf: [{ first: 'REQUIRED', integer: 'Value has to be higher or equal than 5' }] }
        ]
      });
      expect(schema.validateAll({ first: true })).toBeUndefined();

      // two values

      schemaDef = createBaseSchema();
      schemaDef.allOf = [{ required: ['first'] }, { required: ['second'] }];

      schema = new Schema(schemaDef);
      expect(schema.validateAll({ first: true, second: true })).toBeUndefined();

      let result = schema.validateAll({ first: true });
      expect(result).toEqual({
        VALIDATION: [{ allOf: [{ second: 'REQUIRED' }] }]
      });
      expect(schema.interpretResults(result)).toEqual({ second: { allOf: ['REQUIRED'] } });

      expect(schema.validateAll({ second: true })).toEqual({
        VALIDATION: [{ allOf: [{ first: 'REQUIRED' }] }]
      });
      result = schema.validateAll({});
      expect(result).toEqual({
        VALIDATION: [{ allOf: [{ first: 'REQUIRED' }, { second: 'REQUIRED' }] }]
      });
      expect(schema.interpretResults(result)).toEqual({
        first: { allOf: ['REQUIRED'] },
        second: { allOf: ['REQUIRED'] }
      });
    });

    it('validates oneOf value', () => {
      // ====================================
      // if all are false it is an error
      // one value

      let schemaDef = createBaseSchema();
      schemaDef.oneOf = [{ required: ['first'] }];

      let schema = new Schema(schemaDef);
      // expect(schema.validateAll({})).toEqual({
      //   VALIDATION: [{ oneOf: [{ REQUIRED: ['first'] }] }]
      // });
      // expect(schema.validateAll({ first: true })).toBeUndefined();

      // two required values
      schemaDef = createBaseSchema();
      schemaDef.oneOf = [{ required: ['first'] }, { required: ['second'] }];
      // schemaDef.properties.integer.minimum = 5;
      schemaDef.properties.integer.oneOf = [{ minimum: 10 }, { minimum: 15 }];

      schema = new Schema(schemaDef);
      // expect(schema.validateAll({})).toEqual({
      //   VALIDATION: [{ oneOf: [{ REQUIRED: ['first'] }, { REQUIRED: ['second'] }] }]
      // });
      expect(schema.validateAll({ first: true, second: true, integer: 3 })).toEqual({
        VALIDATION: [
          {
            oneOf: [
              {
                first: 'REQUIRED',
                integer: {
                  VALIDATION: [
                    {
                      oneOf: [
                        'Value has to be higher or equal than 10',
                        'Value has to be higher or equal than 15'
                      ]
                    }
                  ]
                }
              },
              {
                integer: {
                  VALIDATION: [
                    {
                      oneOf: [
                        'Value has to be higher or equal than 10',
                        'Value has to be higher or equal than 15'
                      ]
                    }
                  ]
                },
                second: 'REQUIRED'
              }
            ]
          }
        ]
      });

      // two values

      schemaDef = createBaseSchema();
      schemaDef.properties.integer.oneOf = [{ minimum: 10 }, { minimum: 15 }];

      schema = new Schema(schemaDef);
      expect(schema.validateAll({ integer: 25 })).toEqual({
        integer: {
          VALIDATION: [
            {
              oneOf: [
                'Value has to be higher or equal than 10',
                'Value has to be higher or equal than 15'
              ]
            }
          ]
        }
      });
      expect(schema.validateAll({ integer: 2 })).toEqual({
        integer: {
          VALIDATION: [
            {
              oneOf: [
                'Value has to be higher or equal than 10',
                'Value has to be higher or equal than 15'
              ]
            }
          ]
        }
      });
      expect(schema.validateAll({ integer: 11 })).toBeUndefined();
    });
  });
});
