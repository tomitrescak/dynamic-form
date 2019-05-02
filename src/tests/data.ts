import { FormElement } from '../form_definition';

export const create = {
  formElement: (formElement: Partial<FormElement> = {}): FormElement => ({
    source: 'source',
    label: 'Label',
    control: null,
    props: null,
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
