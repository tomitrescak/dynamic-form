import * as React from 'react';

import { DataSet } from './form_store';
import { JSONSchema } from './json_schema';

export type Handler<O = any, CTX = any, ARGS = any, P = any, C = any, D = any, CH = any> = (
  owner: DataSet<O>,
  props: FormComponentProps<P, D, CH>,
  context: CTX,
  args?: ARGS
) => any;

export type Handlers<O, CTX> = {
  [index: string]: Handler<O, CTX>;
};

type ParseArgs = {
  current: any;
  previous: any;
};
export type ParseHandler<O, CTX, ARGS = {}> = Handler<O, CTX, ParseArgs & ARGS>;

type ValidateArgs = {
  value: any;
  source: string;
};
export type ValidateHandler<T, U, V = {}> = Handler<T, U, ValidateArgs & V>;

export type FormComponentProps<P = any, CH = any, O = any> = {
  className?: string;
  catalogue: FormComponentCatalogue;
  formElement: FormElement<P, CH>;
  handlers?: Handlers<O, any>;
  owner: DataSet<O>;
  readOnly?: boolean;
  extra?: any;
  // renderControl?: (
  //   element: FormElement<O, C>,
  //   props: FormComponentProps<O, C, T>,
  //   ...other: any[]
  // ) => any;
};

export type FormComponent<P = any, CH = any, O = any> = {
  Component: React.ComponentType<FormComponentProps<P, CH, O>>;
  // manualCss?: boolean;
  toString?(
    owner: DataSet<O>,
    props: FormComponentProps<P, CH>,
    context: any,
    catalogue: FormComponentCatalogue
  ): string;
  toHtml?(
    owner: DataSet<O>,
    props: FormComponentProps<P, CH>,
    context: any,
    catalogue: FormComponentCatalogue
  ): string;
};

export type FormComponentCatalogue = {
  components: { [index: string]: FormComponent | React.ComponentType<any> };
  // manualCss?: boolean;
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

// [K in keyof T]: Prop;
export type PropMap = { [index: string]: Prop };

export type Prop = {
  control: FormElement;
  schema?: JSONSchema;
  defaultValue?: any;
  propSource?: 'value' | 'handler' | 'binding';
  propTarget?: 'control';
};

export type EditorComponent<P = any, C = any, CH = any, O = any> = {
  Component: React.ComponentType<FormComponentProps<P, CH, O>>;
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
  bound?: boolean;
  events?: boolean;
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

export type EditorFormViewProps<P, CH, O> = {
  formElement: FormElement<P, CH>;
  owner: DataSet<O>;
  catalogue: FormComponentCatalogue;
  handlers?: { [index: string]: any };
  readOnly?: boolean;
};

type FormProp = {
  [index: string]: string | number | boolean | BoundProp;
};

export interface FormElement<P = any, CH = any> {
  uid?: string;
  documentation?: string;
  group?: string;
  tuple?: string;
  tupleOrder?: number;
  css?: string;
  className?: string;
  control?: string;
  props?: P;
  label?: string;
  parent?: FormElement<any>;
  elements?: FormElement<any, CH>[];
  pages?: FormElement<CH, any>[];
  // editor?: {
  //   label?: string;
  //   locked?: boolean;
  //   template?: number;
  // };
  // visibleHandler?: keyof HA;
  // validateHandler?: keyof HA;
  // parseHandler?: keyof HA;
  // valueHandler?: keyof HA;
  // optionsHandler?: keyof HA;
}

export type BoundProp = {
  value?: any;
  handler?: string;
  source?: string;
  validate?: string;
  parse?: string;
};

// type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
// type SafeElement<U = any, C = any> = Omit<FormElement<U, C>, 'controlProps'>;

// options?: (owner: DataSet<T>) => Option[];
//     validate?: (value: any, owner: T, source: string) => string | void;
//     visible?: (owner: DataSet<T>) => boolean;
//     parse?: (value: string, prev: any, owner: T) => any;
//     value?: (owner: DataSet<T>, source: string) => any;
