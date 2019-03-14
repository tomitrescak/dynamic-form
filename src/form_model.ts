import Ajv from 'ajv';

import { Schema } from './data_schema_model';
import { DataSet, ValidationResult } from './form_store';
import { buildStore } from './mst_builder';
import { setUndoManager } from './undo_manager';
import { FormElement, FormDefinition } from './form_definition';
import { JSONSchema } from './json_schema';
import { FormPreviewHtml } from './form_preview_html';
import { FormPreviewText } from './form_preview_text';

export interface IFormElementOwner {
  elements?: FormElement[];
}

function formItemSort(a: FormElement, b: FormElement) {
  return a.row < b.row
    ? -1
    : a.row > b.row
    ? 1
    : a.column < b.column
    ? -1
    : a.column > b.column
    ? 1
    : 0;
}

/* =========================================================
    Form Model
   ======================================================== */

export class FormModel {
  dataSet: DataSet;
  name: string;
  description: string;
  elements: FormElement[];

  constructor(form: FormDefinition, jsonSchema: JSONSchema, data: any, setUndo = true) {
    this.name = form.name;
    this.description = form.description;
    this.elements = form.elements;

    // sort elements by row and column
    this.elements.sort(formItemSort);

    // create dataset
    if (jsonSchema) {
      const schema = new Schema(jsonSchema);
      this.dataSet = buildStore(schema).create(data);

      // set undo manager
      if (setUndo) {
        setUndoManager(this.dataSet);
      }
    }
  }

  createHtmlPreview() {
    let formPreview = new FormPreviewHtml();
    return formPreview.render(this, this.dataSet);
  }

  createTextPreview() {
    let textPreview = new FormPreviewText();
    return textPreview.render(this, this.dataSet);
  }

  validateWithReport(
    root: IFormElementOwner = this,
    owner = this.dataSet
  ): boolean | Ajv.ErrorObject[] {
    return owner.validateDataset();
  }

  // validateWithReport(root: IFormElementOwner = this, owner = this.dataSet): ValidationResult {
  //   let total = 0;
  //   let valid = 0;
  //   let required = 0;
  //   let requiredValid = 0;

  //   // validate self

  //   for (let element of root.elements) {
  //     if (element.control === 'Form') {
  //       // form can change owner
  //       let result = this.validateWithReport(
  //         element,
  //         element.source ? owner.getValue(element.source) : owner
  //       );
  //       total += result.total;
  //       valid += result.valid;
  //       required += result.required;
  //       requiredValid += result.requiredValid;

  //       continue;
  //     } else if (element.control === 'Table' || element.control === 'Repeater') {
  //       // validate individual elements
  //       let array: any[] = owner.getValue(element.source);

  //       // browse array and validate each element
  //       for (let item of array) {
  //         let result = this.validateWithReport(element, item);
  //         total += result.total;
  //         valid += result.valid;
  //         required += result.required;
  //         requiredValid += result.requiredValid;
  //       }
  //     }

  //     let schema = owner.getSchema(element.source);
  //     let isRequired = schema.required || schema.minItems > 0;

  //     // if the element is not required and it does not have any value
  //     // we exclude it from the validation

  //     if (!element.source || (!isRequired && !owner.getValue(element.source))) {
  //       continue;
  //     }

  //     if (isRequired) {
  //       required++;
  //     }

  //     total += 1;

  //     let value = owner.validate(element.source);
  //     if (!value) {
  //       valid += 1;
  //       requiredValid += isRequired ? 1 : 0;
  //     }
  //   }

  //   // create report
  //   return {
  //     required,
  //     requiredValid,
  //     total,
  //     valid,
  //     invalid: total - valid
  //   };
  // }
}
