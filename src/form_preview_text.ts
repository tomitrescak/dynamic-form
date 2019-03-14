import { groupByArray } from '@tomino/toolbelt/group-by-array';
import { FormElement } from './form_definition';
import { DataSet } from './form_store';

export interface IFieldOwner {
  elements?: FormElement[];
}

interface Props {
  owner: DataSet;
  formControl: IFieldOwner;
  handlers?: { [index: string]: () => void };
  child?: boolean;
}

export class FormPreviewText {
  lastRow = -1;
  lastColumn = -1;

  renderControl(control: FormElement, dataSet: DataSet): string {
    const formElement = control as FormElement;
    const value = dataSet.getValue(formElement.source);

    switch (formElement.control) {
      case 'Image':
        return formElement.url;
      case 'ApproveButton':
      case 'RejectButton':
      case 'Comment':
      case 'Text':
        return '';
      case 'Textarea':
      case 'Formula':
      case 'Input':
        return value;
      case 'Select': {
        let { source, controlProps, list, filterSource, filterColumn } = formElement;

        const options = filterSource
          ? dataSet
              .getSchema(list)
              .$enum.filter((v: any) => v[filterColumn] === dataSet.getValue(filterSource))
          : dataSet.getSchema(list).$enum; /*?*/

        if (!options) {
          throw new Error(
            `Could not find options for source '${source}' requesting '${list}' and filterSource '${filterSource}'`
          );
        }
        const text = options.find(o => o.value === value).text;
        return text;
      }
      case 'Checkbox':
        return dataSet.getValue(formElement.source) ? 'Yes' : 'No';
      case 'Radio':
        let radioList = formElement.list;
        const radioOptions = dataSet.getSchema(radioList).$enum;
        const radioText = radioOptions.find(o => o.value === value).text;
        return radioText;
      case 'Repeater':
        const repeaterList: DataSet[] = dataSet.getValue(formElement.source);
        return repeaterList
          .map(
            (l, i) =>
              `[${i + 1}] ${this.render(formElement, l)
                .split('\n')
                .join('\n    ')}`
          )
          .join('\n\n');
      case 'Table':
        const tableList: DataSet[] = dataSet.getValue(formElement.source);
        return tableList
          .map(
            (v, i) =>
              `[${i + 1}] ${formElement.elements
                .map(e => `${e.label}: ${v.getValue(e.source)}`)
                .join('\n    ')}`
          )
          .join('\n\n');
      case 'Form':
        return this.render(formElement, dataSet.getValue(control.source));
      case 'Signature':
        return '';
    }

    throw new Error('Not implemented: ' + formElement.control);
  }

  renderColumn(control: FormElement, owner: DataSet) {
    if (control.row !== this.lastRow) {
      this.lastRow = control.row;
      this.lastColumn = 0;
    }
    // we initialise all columns and add missing ones in between
    let columns = [];
    const formControl = control;

    let label =
      formControl.control === 'Text'
        ? `\n${formControl.label}`
        : !formControl.label
        ? ''
        : formControl.elements && formControl.elements.length
        ? `: ${formControl.label.trim()}`
        : `${formControl.label.trim()}: `;

    if (formControl.elements && formControl.elements.length) {
      columns.push(`\n== Start${label} ==
${this.renderControl(control, owner)}
== End${label} ==`);
    } else {
      columns.push(`${label}${this.renderControl(control, owner)}`);
    }

    this.lastColumn = control.column + control.width;
    return columns;
  }

  render(formControl: FormElement, owner: DataSet) {
    this.lastColumn = 0;
    this.lastRow = 0;

    const rows = groupByArray(formControl.elements, 'row');
    return rows
      .map(row => {
        const rendered = []
          .concat(
            ...row.values
              .filter(v => v.control !== 'Signature')
              .map(element => this.renderColumn(element, owner))
          )
          .join('\n');
        return rendered;
      })
      .join('\n');
  }
}
