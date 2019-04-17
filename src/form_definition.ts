import * as React from 'react';

import { DataSet } from './form_store';
import { JSONSchema } from './json_schema';

export type Handler<T = DataSet, U = any, V = any> = (owner?: T, args?: U) => V;

export type Handlers<T> = {
  [index: string]: Handler<T>;
};

type ParseArgs = {
  current: any;
  previous: any;
};
export type ParseHandler<T> = Handler<T, ParseArgs>;

type ValidateArgs = {
  value: any;
  source: string;
};
export type ValidateHandler<T> = Handler<T, ValidateArgs>;

export type FormComponentProps<U = FormElement, T = DataSet> = {
  owner: T;
  formElement: U;
  handlers?: Handlers<T>;
  readOnly?: boolean;
  catalogue: FormComponentCatalogue;
  renderControl?: (element: U, props: FormComponentProps<U, T>, ...other: any[]) => any;
};

export type FormComponent<U = FormElement, T = any> = {
  Component: React.ComponentType<FormComponentProps<U, T>>;
  toString?(formElement: U, owner: DataSet<T>, catalogue: FormComponentCatalogue<U, T>): string;
  toHtml?(formElement: U, owner: DataSet<T>, catalogue: FormComponentCatalogue<U, T>): string;
};

export type FormComponentCatalogue<U = FormElement, T = any> = {
  components: { [index: string]: FormComponent<U, T> };
  cssClass: string;
};

export type Option = {
  [index: string]: any;
  text?: string;
  value: string;
  icon?: string;
  disabled?: boolean;
  description?: string;
  type?: string;
};

export type EditorFormComponentProps = {
  text: string;
  value: string;
  options?: Option[];
  help?: string;
  type?: string;
};

export type EditorFormComponent = {
  Component: React.ComponentType<FormComponentProps>;
  modifiers?: FormElement[];
  componentPropDefinitions?: JSONSchema;
  childPropDefinitions?: JSONSchema;
  control: string;
  icon: string;
  title: string;
  defaultChildren?: FormElement[];
  componentProps?: { [index: string]: any };
};

export type EditorFormComponentCatalogue = {
  components: { [index: string]: EditorFormComponent };
  cssClass: string;
};

export type FormExtension = (props: FormViewProps) => void;

export type FormViewProps = {
  formElement: FormElement;
  extensions?: FormExtension[];
  owner: DataSet;
  catalogue: FormComponentCatalogue;
  handlers?: { [index: string]: any };
  readOnly?: boolean;
};

export type EditorFormViewProps = {
  formElement: FormElement;
  owner: DataSet;
  catalogue: EditorFormComponentCatalogue;
  handlers?: { [index: string]: any };
  readOnly?: boolean;
};

export interface FormDefinition<T = any, H = any> {
  name: string;
  description?: string;
  elements?: FormElement<T, H>[];
}

export interface PropMap {
  [index: string]: any;
}

export interface FormElement<T = any, H = any> {
  uid?: string;
  css?: string;
  source?: string;
  sourceRef?: string;
  type?: string;
  skipValidation?: boolean;
  label?: string;
  text?: string;
  renderer?: string;
  handler?: keyof H;
  inline?: boolean;
  parent?: FormElement<T, H>;
  list?: string;
  readOnly?: boolean;
  filterSource?: string;
  filterColumn?: string;
  control?: string;
  controlProps?: PropMap;
  vertical?: boolean;
  options?: keyof H;
  validate?: keyof H;
  visible?: keyof H;
  parse?: keyof H;
  value?: keyof H;
  info?: string;
  elements?: FormElement<T, H>[];
  target?: string;
}

// options?: (owner: DataSet<T>) => Option[];
//     validate?: (value: any, owner: T, source: string) => string | void;
//     visible?: (owner: DataSet<T>) => boolean;
//     parse?: (value: string, prev: any, owner: T) => any;
//     value?: (owner: DataSet<T>, source: string) => any;
