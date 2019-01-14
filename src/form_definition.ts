export type FormControl =
  | 'Input'
  | 'Select'
  | 'Formula'
  | 'Checkbox'
  | 'Radio'
  | 'Textarea'
  | 'Repeater'
  | 'Table'
  | 'Text'
  | 'Form'
  | 'DeleteButton'
  | 'ApproveButton'
  | 'RejectButton'
  | 'Signature';

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
  filterSource?: string;
  filterColumn?: string;
  control?: FormControl;
  controlProps?: { [index: string]: any };
  vertical?: boolean;
  elements?: FormElement[];
}
