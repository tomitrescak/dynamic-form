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
  toString?(formElement: U, owner: DataSet<T>, catalogue: FormComponentCatalogue): string;
  toHtml?(formElement: U, owner: DataSet<T>, catalogue: FormComponentCatalogue): string;
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

export type EditorComponent<U = FormElement, T = any> = {
  Component: React.ComponentType<FormComponentProps<U, T>>;
  modifiers?: FormElement[];
  componentPropDefinitions?: { [index: string]: JSONSchema };
  childPropDefinitions?: { [index: string]: JSONSchema };
  control: string;
  icon: string;
  title: string;
  defaultChildren?: FormElement[];
  componentProps?: { [index: string]: any };
};

export type EditorComponentCatalogue<U = EditorComponent> = {
  components: { [index: string]: U };
  cssClass: string;
};

export type FormExtension = (props: FormViewProps) => void;

export type FormViewProps = {
  formElement: FormElement;
  extensions?: FormExtension[];
  owner: DataSet;
  catalogue: FormComponentCatalogue<any>;
  handlers?: { [index: string]: any };
  readOnly?: boolean;
};

export type EditorFormViewProps<U, T = DataSet> = {
  formElement: U;
  owner: T;
  catalogue: FormComponentCatalogue<U>;
  handlers?: { [index: string]: any };
  readOnly?: boolean;
};

export interface FormDefinition<H = any> {
  name: string;
  description?: string;
  elements?: FormElement<any, any, H>[];
}

export interface PropMap {
  [index: string]: any;
}

export interface FormElement<O = any, C = any, H = any> {
  // text?: string;

  // list?: string;
  // filterSource?: string;
  // filterColumn?: string;
  // options?: keyof H;

  // vertical?: boolean;

  // target?: string;
  // inline?: boolean;

  // type?: string;

  // handler?: keyof H;
  // renderer?: string;

  // sourceRef?: string;

  inline?: boolean;
  uid?: string;
  label?: string;
  info?: string;
  css?: string;
  source?: string;
  control?: string;
  controlProps?: O;
  readOnly?: boolean;
  skipValidation?: boolean;
  parent?: FormElement<any, any, H>;
  elements?: FormElement<C, any, H>[];

  controlHandlers?: keyof H;
  validateHandler?: keyof H;
  visibleHandler?: keyof H;
  parseHandler?: keyof H;
  valueHandler?: keyof H;
  optionsHandler?: keyof H;
}

// options?: (owner: DataSet<T>) => Option[];
//     validate?: (value: any, owner: T, source: string) => string | void;
//     visible?: (owner: DataSet<T>) => boolean;
//     parse?: (value: string, prev: any, owner: T) => any;
//     value?: (owner: DataSet<T>, source: string) => any;
