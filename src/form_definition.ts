import { DataSet } from './form_store';

export type FormControl =
  | 'ApproveButton'
  | 'Checkbox'
  | 'Comment'
  | 'Date'
  | 'DateRange'
  | 'DateTime'
  | 'DeleteButton'
  | 'EditorCell'
  | 'Form'
  | 'Formula'
  | 'Group'
  | 'Image'
  | 'Input'
  | 'Map'
  | 'Modal'
  | 'Menu'
  | 'Radio'
  | 'RejectButton'
  | 'Repeater'
  | 'Search'
  | 'Select'
  | 'Signature'
  | 'SubmitButton'
  | 'Table'
  | 'Text'
  | 'Textarea'
  | 'Time'
  | 'Value';

export interface FormDefinition<T = any> {
  name: string;
  description?: string;
  elements?: FormElement<T>[];
}

export interface PropMap {
  [index: string]: string | number | boolean | Date | PropMap;
}

export type DropdownValue = { value: string; text: string; disabled?: boolean };

export interface FormElement<T = any> {
  row?: number;
  column?: number;
  css?: string;
  width?: number;
  source?: string;
  sourceRef?: string;
  label?: string;
  renderer?: string;
  handler?: string;
  inline?: boolean;
  parent?: FormElement<T>;
  list?: string;
  readOnly?: boolean;
  filterSource?: string;
  filterColumn?: string;
  control?: FormControl;
  controlProps?: PropMap;
  vertical?: boolean;
  options?: (owner: DataSet<T>) => DropdownValue[];
  validate?: (value: any, owner: T) => string;
  visible?: (owner: DataSet<T>) => boolean;
  parse?: (value: string, prev: any, owner: T) => any;
  value?: (owner: DataSet<T>, source: string) => any;
  info?: string;
  elements?: FormElement<T>[];
  url?: string;
}
