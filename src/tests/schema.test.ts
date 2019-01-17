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

      const schema = new Schema(schemaDef); /*?*/
      const result = schema.validateDataset({});

      expect(result).toEqual({ first: 'Value is required' });
    });

    it('valid schema returns undefined', () => {
      const schemaDef = createBaseSchema();
      const schema = new Schema(schemaDef);
      const result = schema.validateDataset({});
      expect(result).toBeUndefined();
    });

    it('validates anyOf value', () => {
      // ====================================
      // if all are false it is an error
      // one value

      let result = null;
      let schemaDef = createBaseSchema();
      schemaDef.anyOf = [{ required: ['first'] }];

      let schema = new Schema(schemaDef);
      expect(schema.validateDataset({})).toEqual({
        first: 'Value is required'
      });
      expect(schema.validateDataset({ first: true })).toBeUndefined();

      // two values

      schemaDef = createBaseSchema();
      schemaDef.anyOf = [{ required: ['first'] }, { required: ['second'] }];

      schema = new Schema(schemaDef);
      expect(schema.validateDataset({ first: true })).toBeUndefined();
      expect(schema.validateDataset({ second: true })).toBeUndefined();
      result = schema.validateDataset({});

      expect(result).toEqual([{ first: 'Value is required' }, { second: 'Value is required' }]);
    });

    it('validates combined value', () => {
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
      expect(schema.validateDataset({ first: true })).toEqual([
        { integer: 'Value is required' },
        { integer: 'Value is required', second: 'Value is required' }
      ]);
      result = schema.validateDataset({});
      expect(result).toEqual([
        { first: 'Value is required', integer: 'Value is required' },
        { integer: 'Value is required', second: 'Value is required' }
      ]);
    });

    it('validates anyOf number value', () => {
      // if all are false it is an error
      // one value

      let schemaDef = createBaseSchema();
      schemaDef.properties.integer.minimum = 10;

      let schema = new Schema(schemaDef);

      const result = schema.validateDataset({ integer: 5 });
      expect(result).toEqual({
        integer: 'Value has to be higher or equal than 10'
      });
      expect(schema.validateDataset({ integer: 10 })).toBeUndefined();
    });

    it('validates anyOf internal number value', () => {
      // if all are false it is an error
      // one value

      let schemaDef = createBaseSchema();
      schemaDef.properties.complex.properties.max5.maximum = 5;

      let schema = new Schema(schemaDef);

      let result = schema.validateDataset({ complex: { max5: 15 } });
      expect(result).toEqual({
        complex: { max5: 'Value has to be lower or equal than 5' }
      });
      expect(schema.validateDataset({ complex: { max5: 0 } })).toBeUndefined();
    });

    it('validates anyOf number value', () => {
      // if all are false it is an error
      // one value

      let schemaDef = createBaseSchema();
      schemaDef.properties.integer.anyOf = [{ minimum: 10 }, { maximum: 0 }];

      let schema = new Schema(schemaDef);

      expect(schema.validateDataset({ integer: 5 })).toEqual([
        { integer: 'Value has to be higher or equal than 10' },
        { integer: 'Value has to be lower or equal than 0' }
      ]);
    });

    it('validates allOf number value', () => {
      // if all are false it is an error
      // one value

      let schemaDef = createBaseSchema();
      schemaDef.properties.integer.allOf = [{ minimum: 10 }, { maximum: 0 }];

      let schema = new Schema(schemaDef);

      let result = schema.validateDataset({ integer: 5 });
      expect(result).toEqual({ integer: 'Value has to be higher or equal than 10' });

      result = schema.validateDataset({ integer: 15 });
      expect(result).toEqual({ integer: 'Value has to be lower or equal than 0' });
    });

    it('validates allOf value', () => {
      // ====================================
      // if all are false it is an error
      // one value

      let schemaDef = createBaseSchema();
      schemaDef.allOf = [{ required: ['first'] }];
      schemaDef.properties.integer.minimum = 5;

      let schema = new Schema(schemaDef);
      expect(schema.validateDataset({ integer: 2 })).toEqual({
        first: 'Value is required',
        integer: 'Value has to be higher or equal than 5'
      });
      expect(schema.validateDataset({ first: true })).toBeUndefined();

      // two values

      schemaDef = createBaseSchema();
      schemaDef.allOf = [{ required: ['first'] }, { required: ['second'] }];

      schema = new Schema(schemaDef);
      expect(schema.validateDataset({ first: true, second: true })).toBeUndefined();

      let result = schema.validateDataset({ first: true });
      expect(result).toEqual({ second: 'Value is required' });

      expect(schema.validateDataset({ second: true })).toEqual({ first: 'Value is required' });
      result = schema.validateDataset({});
      expect(result).toEqual({ first: 'Value is required', second: 'Value is required' });
    });

    xit('validates oneOf value', () => {
      // ====================================
      // if all are false it is an error
      // one value

      let schemaDef = createBaseSchema();
      schemaDef.oneOf = [{ required: ['first'] }];

      let schema = new Schema(schemaDef);
      // expect(schema.validateDataset({})).toEqual({
      //   VALIDATION: [{ oneOf: [{ REQUIRED: ['first'] }] }]
      // });
      // expect(schema.validateDataset({ first: true })).toBeUndefined();

      // two required values
      schemaDef = createBaseSchema();
      schemaDef.oneOf = [{ required: ['first'] }, { required: ['second'] }];
      // schemaDef.properties.integer.minimum = 5;
      schemaDef.properties.integer.oneOf = [{ minimum: 10 }, { minimum: 15 }];

      schema = new Schema(schemaDef);
      // expect(schema.validateDataset({})).toEqual({
      //   VALIDATION: [{ oneOf: [{ REQUIRED: ['first'] }, { REQUIRED: ['second'] }] }]
      // });
      expect(schema.validateDataset({ first: true, second: true, integer: 3 })).toEqual({
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
      expect(schema.validateDataset({ integer: 25 })).toEqual({
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
      expect(schema.validateDataset({ integer: 2 })).toEqual({
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
      expect(schema.validateDataset({ integer: 11 })).toBeUndefined();
    });
  });
});
