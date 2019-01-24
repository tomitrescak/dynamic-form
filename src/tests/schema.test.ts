import { JSONSchema } from '../json_schema';
import { Schema } from '../data_schema_model';
import { buildStore } from '../mst_builder';
import { config } from '../config';
import { DataSet } from '../form_store';

describe('Schema', () => {
  function createBaseSchema(): JSONSchema {
    return {
      type: 'object',
      properties: {
        first: {
          type: 'boolean'
        },
        second: {
          type: 'boolean',
          default: false
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

  describe('convertPath', () => {
    it('converts paths from mobx-state-tree to json schema style', () => {
      expect(Schema.convertPath('/tomi/other/0/now/1')).toEqual('.tomi.other[0].now[1]');
    });
  });

  describe('parseParent', () => {
    it('creates a parent path and a property', () => {
      expect(Schema.parseParent('')).toEqual({ property: '', dataPath: '' });
      expect(Schema.parseParent('foo')).toEqual({ property: 'foo', dataPath: '' });
      expect(Schema.parseParent('foo.boo')).toEqual({ property: 'boo', dataPath: 'foo' });
      expect(Schema.parseParent('foo[0].boo')).toEqual({ property: 'boo', dataPath: 'foo[0]' });
    });
  });

  describe('reassignErrors', () => {
    it('assigns required field errors as specific errors', () => {
      expect(
        Schema.reassignErrors([
          {
            keyword: 'required',
            dataPath: '',
            schemaPath: '#/required',
            params: {
              missingProperty: 'name'
            },
            message: "should have required property 'name'"
          },
          {
            keyword: 'required',
            dataPath: '/accounts/0',
            schemaPath: '#/properties/accounts/items/required',
            params: {
              missingProperty: 'money'
            },
            message: "should have required property 'money'"
          }
        ])
      ).toEqual([
        {
          keyword: 'required',
          dataPath: '/name',
          schemaPath: '#/required',
          params: {
            missingProperty: 'name'
          },
          message: 'Value is required'
        },
        {
          keyword: 'required',
          dataPath: '/accounts/0/money',
          schemaPath: '#/properties/accounts/items/required',
          params: {
            missingProperty: 'money'
          },
          message: 'Value is required'
        }
      ]);
    });
  });

  describe('validate', () => {
    it('validates required value', () => {
      const schemaDef = createBaseSchema();
      schemaDef.required = ['first'];

      const schema = new Schema(schemaDef);
      const result = schema.validate({} as DataSet);

      expect(result).toEqual([
        {
          dataPath: '/first',
          keyword: 'required',
          message: 'Value is required',
          params: { missingProperty: 'first' },
          schemaPath: '#/required'
        }
      ]);
    });

    it('valid schema returns undefined', () => {
      const schemaDef = createBaseSchema();
      const schema = new Schema(schemaDef);
      const result = schema.validate({} as DataSet);
      expect(result).toBeFalsy();
    });

    it('assigns errors to dataset', () => {
      config.setDirty = jest.fn();
      const schemaDef = createBaseSchema();
      schemaDef.required = ['first'];
      const schema = new Schema(schemaDef);

      const dataset = buildStore(schema).create({ integer: '2.3' });

      const r = schema.validate(dataset);
      expect(r).toEqual([
        {
          dataPath: '/first',
          keyword: 'required',
          message: 'Value is required',
          params: { missingProperty: 'first' },
          schemaPath: '#/required'
        },
        {
          dataPath: '/integer',
          keyword: 'type',
          message: 'should be integer',
          params: { type: 'integer' },
          schemaPath: '#/properties/integer/type'
        }
      ]);

      let result = schema.validateAndAssignErrors(dataset);

      expect(result).toEqual([
        {
          dataPath: '/first',
          keyword: 'required',
          message: 'Value is required',
          params: { missingProperty: 'first' },
          schemaPath: '#/required'
        },
        {
          dataPath: '/integer',
          keyword: 'type',
          message: 'should be integer',
          params: { type: 'integer' },
          schemaPath: '#/properties/integer/type'
        }
      ]);
      expect(dataset.errors.get('integer')).toBe('should be integer');
      expect(dataset.errors.get('first')).toBe('Value is required');

      dataset.setValue('first', true);

      result = schema.validateAndAssignErrors(dataset);

      expect(result).toEqual([
        {
          dataPath: '/integer',
          keyword: 'type',
          message: 'should be integer',
          params: { type: 'integer' },
          schemaPath: '#/properties/integer/type'
        }
      ]);
      expect(dataset.errors.get('integer')).toBe('should be integer');
      expect(dataset.errors.get('first')).toBe('');
    });

    it('assigns custom errors to dataset', () => {
      config.setDirty = jest.fn();
      const schemaDef = createBaseSchema();
      schemaDef.required = ['first'];
      schemaDef.errorMessage = { required: { first: 'First must be specified!' } };
      schemaDef.properties.integer.errorMessage = 'Must be int, buddy!';
      const schema = new Schema(schemaDef);

      const dataset = buildStore(schema).create({ integer: '2.3' });

      const r = schema.validate(dataset);
      const validationResult = [
        {
          keyword: 'errorMessage',
          dataPath: '/integer',
          schemaPath: '#/properties/integer/errorMessage',
          params: {
            errors: [
              {
                keyword: 'type',
                dataPath: '/integer',
                schemaPath: '#/properties/integer/type',
                params: { type: 'integer' },
                message: 'should be integer'
              }
            ]
          },
          message: 'Must be int, buddy!'
        },
        {
          keyword: 'errorMessage',
          dataPath: '/first',
          schemaPath: '#/errorMessage',
          params: {
            errors: [
              {
                keyword: 'required',
                dataPath: '',
                schemaPath: '#/required',
                params: { missingProperty: 'first' },
                message: "should have required property 'first'"
              }
            ]
          },
          message: 'First must be specified!'
        }
      ];

      expect(r).toEqual(validationResult);

      let result = schema.validateAndAssignErrors(dataset);

      expect(result).toEqual(validationResult);
      expect(dataset.errors.get('integer')).toBe('Must be int, buddy!');
      expect(dataset.errors.get('first')).toBe('First must be specified!');

      dataset.setValue('first', true);

      result = schema.validateAndAssignErrors(dataset);

      expect(result).toEqual([
        {
          keyword: 'errorMessage',
          dataPath: '/integer',
          schemaPath: '#/properties/integer/errorMessage',
          params: {
            errors: [
              {
                keyword: 'type',
                dataPath: '/integer',
                schemaPath: '#/properties/integer/type',
                params: { type: 'integer' },
                message: 'should be integer'
              }
            ]
          },
          message: 'Must be int, buddy!'
        }
      ]);
      expect(dataset.errors.get('integer')).toBe('Must be int, buddy!');
      expect(dataset.errors.get('first')).toBe('');
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
      expect(schema.validate({ first: true } as any)).toEqual([
        {
          dataPath: '/integer',
          keyword: 'required',
          message: 'Value is required',
          params: { missingProperty: 'integer' },
          schemaPath: '#/allOf/0/required'
        }
      ]);
    });
  });
});
