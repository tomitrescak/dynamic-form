import { FormDefinition, FormElement } from '../form_definition';

export const create = {
  form: (form: Partial<FormDefinition> = {}): FormDefinition => ({
    name: 'Form',
    description: 'Test Form',
    elements: form.elements,
    ...form
  }),
  formElement: (formElement: Partial<FormElement> = {}): FormElement => ({
    source: 'source',
    label: 'Label',
    inline: false,
    list: null,
    filterSource: null,
    filterColumn: null,
    control: null,
    controlProps: null,
    vertical: false,
    elements: [],
    ...formElement
  }),
  date(addDays: number = 0, hours = 0) {
    return new Date(
      `2017-02-${(2 + addDays).toString(10).padStart(2, '0')}T${hours
        .toString(10)
        .padStart(2, '0')}:00:00.000Z`
    );
  }
};
