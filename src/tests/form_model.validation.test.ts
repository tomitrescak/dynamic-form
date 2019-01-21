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
    expect(valid).toEqual(['code: Value is required']);
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
    expect(valid).toEqual(['code: Too long. Has to contain maximum 3 characters']);
    expect(formModel.dataSet.errors.get('code')).toBe(
      'Too long. Has to contain maximum 3 characters'
    );
  });
});
