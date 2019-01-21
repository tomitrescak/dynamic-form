import { autorun } from 'mobx';

import { Schema } from '../data_schema_model';
import { buildStore } from '../mst_builder';
import { create } from './data';
import { JSONSchema } from '../json_schema';

import { config } from '../config';

describe('Dataset', () => {
  let jsonSchema: JSONSchema = {
    type: 'object',
    properties: {
      name: {
        type: 'string'
      },
      age: {
        type: 'integer',
        minimum: 0,
        maximum: 130,
        default: 0
      },
      salary: {
        type: 'number',
        minimum: 0,
        default: 300
      },
      married: {
        type: 'boolean',
        default: false
      },
      dateMarried: {
        type: 'string'
      },
      fatherAge: {
        type: 'integer',
        expression: 'value > this.age + 18',
        validationMessage: 'Father age must be at least 18 years more then your age'
      },
      accounts: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            number: {
              type: 'string',
              pattern: '\\d\\d\\d-\\d\\d\\d'
            },
            money: {
              type: 'number'
            }
          },
          required: ['number']
        },
        uniqueItems: true,
        minItems: 1,
        maxItems: 3
      },
      accountTotal: {
        type: 'expression',
        default: 'this.accounts.reduce((p, n) => n.money + p, 0)'
      },
      address: {
        type: 'object',
        properties: {
          street: {
            type: 'string',
            minLength: 5,
            maxLength: 30
          },
          number: {
            type: 'number',
            exclusiveMinimum: 0,
            exclusiveMaximum: 1000
          }
        }
      }
    },
    required: ['name']
  };

  let schema = new Schema(jsonSchema);

  it('creates a root with object representation', () => {
    expect(schema).toMatchSnapshot();
  });

  it('validates value', () => {
    /* 
    {
      name: 'Tomas', // required
      age: 10, // min 0, max 130
      salary: 120.45, // min 0
      married: true,
      dateMarried: Date,
      fatherAge: 20 //  > age + 18
      accounts: [{ number: '111-222' }] // min 1, max 3 elements, format XXX-XXX
      accountTotal: ... // total, should not be in the final set
      address: {
        street: 'AAA' // minLength 5, maxLength: 30
        number: 555 // min 1, max 999
      }
    } 
    */

    // expression

    expect(schema.properties.age.validateValue(10)).toBeUndefined();
  });

  it('creates a default value', () => {
    expect(schema.defaultValue()).toMatchSnapshot();

    expect(schema.properties.accounts.items.defaultValue()).toMatchSnapshot();
  });

  it.only('creates a new mst and validates values', () => {
    config.setDirty = jest.fn();

    const mst = buildStore(schema);
    const data = mst.create({});
    let error = '';
    // check conversion

    /* =========================================================
        Integer / Number
       ======================================================== */

    // ok

    // data.setValue('age', '30');
    // expect(data.getValue('age')).toEqual(30);

    // data.setValue('salary', '30.15');
    // expect(data.getValue('salary')).toEqual(30.15);

    // data.setValue('salary', '30');
    // expect(data.getValue('salary')).toEqual(30);

    // // format

    // data.setValue('age', '30.15');
    // expect(data.getValue('age')).toEqual('30.15');
    // expect(data.validateValue('age')).toBe('Expected integer value');

    // data.setValue('age', 'Momo');
    // expect(data.getValue('age')).toEqual('Momo');
    // expect(data.validateValue('age')).toBe('Expected integer value');

    // data.setValue('salary', '30.aa');
    // expect(data.getValue('salary')).toEqual('30.aa');
    // expect(data.validateValue('salary')).toBe('Expected decimal value');

    // // minimum

    // data.setValue('age', '0');
    // expect(data.getValue('age')).toEqual(0);

    // data.setValue('age', '-1');
    // expect(data.getValue('age')).toEqual('-1');
    // expect(data.validateValue('age')).toBe('Value has to be higher or equal than 0');

    // // maximum

    // data.setValue('age', '130');
    // expect(data.getValue('age')).toEqual(130);

    // data.setValue('age', '131');
    // expect(data.getValue('age')).toEqual('131');
    // expect(data.validateValue('age')).toBe('Value has to be lower or equal than 130');

    // // subselection ok 'a.b.c'

    // data.setValue('address.number', '20');
    // expect(data.getValue('address.number')).toEqual(20);

    // // exclusive minimum

    // data.setValue('address.number', '0');
    // expect(data.getValue('address.number')).toEqual('0');
    // expect(data.getValue('address').validateValue('number')).toBe('Value has to be higher than 0');

    // data.setValue('address.number', '1');
    // expect(data.getValue('address.number')).toEqual(1);

    // // exclusive maximum

    // data.setValue('address.number', '1000');
    // expect(data.getValue('address.number')).toEqual('1000');
    // expect(data.getValue('address').validateValue('number', '1000')).toBe(
    //   'Value has to be lower than 1000'
    // );

    // data.setValue('address.number', '999');
    // expect(data.getValue('address.number')).toEqual(999);

    // /* =========================================================
    //     String
    //    ======================================================== */

    // // ok

    // data.setValue('name', 'Bobo');
    // expect(data.getValue('name')).toEqual('Bobo');

    // // format ok

    data.addRow('accounts');
    // data.getValue('accounts')[0].setValue('number', '234-234');

    // expect(data.getValue('accounts')[0].number).toEqual('234-234');

    // error = data.getValue('accounts')[0].validateValue('number', '123-123');
    // expect(error).toBeUndefined();

    // format error

    data.getValue('accounts')[0].setValue('number', '123d');
    expect(data.getValue('accounts')[0].number).toEqual('123d');
    error = data.getValue('accounts')[0].validateValue('number');
    expect(error).toEqual('Incorrect format');

    data.getValue('accounts')[0].setValue('number', '');
    error = data.getValue('accounts')[0].validateValue('number', '');
    expect(error).toEqual('Value is required');

    // minLength

    data.getValue('address').setValue('street', '123456');
    error = data.getValue('address').validateValue('street', '123456');
    expect(error).toBeUndefined();

    data.getValue('address').setValue('street', '123');
    error = data.getValue('address').validateValue('street');
    expect(error).toEqual('Too short. Has to contain at least 5 characters');

    // maxLength

    data.getValue('address').setValue('street', '1234567890123456789012345678901234567890');
    error = data.getValue('address').validateValue('street');
    expect(error).toEqual('Too long. Has to contain maximum 30 characters');

    /* =========================================================
        Array
       ======================================================== */

    // min intems

    data.removeRow('accounts', 0);
    error = data.validate('accounts');
    expect(error).toEqual('Collection has to contain at least 1 item');

    // max items

    data.addRow('accounts');
    data.addRow('accounts');
    data.addRow('accounts');
    data.addRow('accounts');

    error = data.validate('accounts');
    expect(error).toEqual('Collection has to contain maximum 3 items');

    data.removeRow('accounts', 3);

    // unique items

    error = data.validate('accounts');
    expect(error).toBe('Collection needs to contain unique items. Items [1, 2, 3] are repetitive');

    data.getValue('accounts')[1].setValue('number', '123-234');

    error = data.validate('accounts');
    expect(error).toBe('Collection needs to contain unique items. Items [1, 3] are repetitive');

    // all is well

    data.getValue('accounts')[0].setValue('number', '123-456');
    data.getValue('accounts')[2].setValue('number', '456-789');

    error = data.validate('accounts');
    expect(error).toBeUndefined();

    // unique items

    /* =========================================================
        Expression
       ======================================================== */

    data.setValue('age', '10');
    data.setValue('fatherAge', '40');
    expect(data.getValue('fatherAge')).toEqual(40);

    // failing expression

    data.setValue('fatherAge', '20');
    expect(data.getValue('fatherAge')).toEqual('20');

    error = data.validateValue('fatherAge');
    expect(error).toBe('Father age must be at least 18 years more then your age');

    data.getSchema('fatherAge').validationMessage = null;

    error = data.validateValue('fatherAge');
    expect(error).toBe('Unexpected value');
  });

  it('creates mst with values', () => {
    const mst = buildStore(schema);
    const data = mst.create({
      age: 50,
      name: 'Tomas',
      fatherAge: 20,
      married: true,
      dateMarried: create.date(),
      salary: 2300.34,
      address: {
        street: 'Elm street',
        number: 4
      },
      accounts: [{ number: '111-222', money: 200 }]
    });

    const m = 1;
    // console.log(create.date new Date(2012, 8, 29, 0, 0, 0, 0).toISOString())

    expect(data.toJS()).toMatchSnapshot();
  });

  it('creates mst with default values', () => {
    const mst = buildStore(schema);
    const defaultData = mst.create({});
    expect(defaultData.toJS()).toMatchSnapshot();
  });

  it('allows to use expressions', () => {
    const mst = buildStore(schema);
    const defaultData = mst.create({
      accounts: [{ number: '1', money: 1 }, { number: '2', money: 2 }, { number: '3', money: 3 }]
    });

    expect(defaultData.getValue('accountTotal')).toBe(6);

    let finalAccount = 0;
    autorun(() => {
      finalAccount = defaultData.getValue('accountTotal');
    });

    // check computed fields
    defaultData.getValue('accounts')[0].setValue('money', 10);
    expect(finalAccount).toEqual(15);
  });
});
