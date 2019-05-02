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

export type FormComponentProps<O = any, C = any, T = any> = {
  catalogue: FormComponentCatalogue;
  formElement: FormElement<O, C>;
  handlers?: Handlers<DataSet<T>>;
  owner: DataSet<T>;
  readOnly?: boolean;
  // renderControl?: (
  //   element: FormElement<O, C>,
  //   props: FormComponentProps<O, C, T>,
  //   ...other: any[]
  // ) => any;
};

export type FormComponent<O = any, C = any, T = any> = {
  Component: React.ComponentType<FormComponentProps<O, C, T>>;
  manualCss?: boolean;
  toString?(
    formElement: FormElement<O, C>,
    owner: DataSet<T>,
    catalogue: FormComponentCatalogue
  ): string;
  toHtml?(
    formElement: FormElement<O, C>,
    owner: DataSet<T>,
    catalogue: FormComponentCatalogue
  ): string;
};

export type FormComponentCatalogue = {
  components: { [index: string]: FormComponent | React.ComponentType<any> };
  manualCss?: boolean;
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

export type PropMap = { [index: string]: Prop };

export type Prop = {
  control: FormElement;
  schema?: JSONSchema;
};

export type EditorComponent<O = any, C = any, T = any> = {
  Component: React.ComponentType<FormComponentProps<O, C, T>>;

  props?: PropMap;
  childProps?: PropMap;
  control: string;
  group?: string;
  icon?: string;
  thumbnail?: {
    light: string;
    dark: string;
  };
  title: string;
  defaultChildren?: FormElement[];
  defaultProps?: { [index: string]: any };
  manualCss?: boolean;
  unbound?: boolean;
  handlers?: any;
};

export type EditorComponentCatalogue = {
  components: { [index: string]: EditorComponent };
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

export type EditorFormViewProps<O, C, T = DataSet> = {
  formElement: FormElement<O, C>;
  owner: T;
  catalogue: FormComponentCatalogue;
  handlers?: { [index: string]: any };
  readOnly?: boolean;
};

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

  inline?: boolean;
  uid?: string;
  label?: string;
  documentation?: string;
  group?: string;
  tuple?: string;
  tupleOrder?: number;
  css?: string;
  source?: string;
  control?: string;
  props?: O;
  readOnly?: boolean;
  skipValidation?: boolean;
  parent?: FormElement<any, any, H>;
  elements?: FormElement<C, any, H>[];
  pages?: FormElement<C, any, H>[];

  validateHandler?: keyof H;
  visibleHandler?: keyof H;
  parseHandler?: keyof H;
  valueHandler?: keyof H;
  optionsHandler?: keyof H;
}

// type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
// type SafeElement<U = any, C = any> = Omit<FormElement<U, C>, 'controlProps'>;

// options?: (owner: DataSet<T>) => Option[];
//     validate?: (value: any, owner: T, source: string) => string | void;
//     visible?: (owner: DataSet<T>) => boolean;
//     parse?: (value: string, prev: any, owner: T) => any;
//     value?: (owner: DataSet<T>, source: string) => any;
