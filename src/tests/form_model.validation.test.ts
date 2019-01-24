import { JSONSchema } from '../json_schema';
import { FormElement, FormDefinition } from '../form_definition';
import { FormModel } from '../form_model';
import { config } from '../config';

describe('FormModel: validation', () => {
  it('validates simple dataset', () => {
    config.setDirty = jest.fn();

    const schema: JSONSchema = {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          maxLength: 3
        }
      },
      required: ['code']
    };
    const form: FormDefinition = {
      name: 'Cool Form',
      elements: [
        {
          control: 'Input',
          source: 'code'
        }
      ]
    };

    let formModel = new FormModel(form, schema, { code: '' });
    let valid = formModel.validateWithReport(); /*?*/
    expect(valid).toEqual([
      {
        dataPath: '/code',
        keyword: 'required',
        message: 'Value is required',
        params: { missingProperty: 'code' },
        schemaPath: '#/required'
      }
    ]);
    expect(formModel.dataSet.errors.get('code')).toBe('Value is required');

    formModel.dataSet.setValue('code', 'AAA');

    expect(formModel.dataSet.errors.get('code')).toBe('');
  });

  it('validates more complex dataset', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          anyOf: [{ maxLength: 3 }, { minLength: 10 }]
        }
      }
    };
    const form: FormDefinition = {
      name: 'Cool Form',
      elements: [
        {
          control: 'Input',
          source: 'code'
        }
      ]
    };

    let formModel = new FormModel(form, schema, { code: 'AAAAA' });
    let valid = formModel.validateWithReport(); /*?*/
    expect(valid).toEqual([
      {
        dataPath: '/code',
        keyword: 'maxLength',
        message: 'should NOT be longer than 3 characters',
        params: { limit: 3 },
        schemaPath: '#/properties/code/anyOf/0/maxLength'
      },
      {
        dataPath: '/code',
        keyword: 'minLength',
        message: 'should NOT be shorter than 10 characters',
        params: { limit: 10 },
        schemaPath: '#/properties/code/anyOf/1/minLength'
      },
      {
        dataPath: '/code',
        keyword: 'anyOf',
        message: 'should match some schema in anyOf',
        params: {},
        schemaPath: '#/properties/code/anyOf'
      }
    ]);
    expect(formModel.dataSet.errors.get('code')).toBe('should NOT be longer than 3 characters');
  });
});
