export type FormControl =
  | 'ApproveButton'
  | 'Checkbox'
  | 'Comment'
  | 'DeleteButton'
  | 'Form'
  | 'Formula'
  | 'Image'
  | 'Input'
  | 'Radio'
  | 'RejectButton'
  | 'Repeater'
  | 'Select'
  | 'Signature'
  | 'Table'
  | 'Text'
  | 'Textarea'
  | 'Value';

export interface FormDefinition {
  name: string;
  description?: string;
  elements?: FormElement[];
}

export interface FormElement {
  row?: number;
  column?: number;
  width?: number;
  source?: string;
  sourceRef?: string;
  label?: string;
  inline?: boolean;
  list?: string;
  readOnly?: boolean;
  filterSource?: string;
  filterColumn?: string;
  control?: FormControl;
  controlProps?: { [index: string]: any };
  vertical?: boolean;
  elements?: FormElement[];
  url?: string;
}
