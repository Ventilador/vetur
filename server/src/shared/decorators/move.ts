import { ISerializer } from '../serialization/types';
import { Reader } from '../parser';
import { getToken, AllConstructors } from './serializersSingleton';

const AllConstructorsVar = 'a';
const readerArg = 'b';
const valueArg = 'c';
const stringifyFn = 'd';
const keys = Symbol('isReady');
export function Move(): (proto: any) => any;
export function Move(ctor: ISerializer<any>): (proto: any, name: string) => void;
export function Move(ctor?: ISerializer<any>) {
  if (ctor) {
    return function decorator(proto: any, name: string) {
      if (!proto[keys]) {
        proto[keys] = [];
      }
      proto[keys].push({ name, ctor });
    };
  } else {
    return function decorator(ctor: ISerializer<any>) {
      const decoratedProps = (ctor as any).prototype[keys].sort(byName);
      ctor.parse = createParser(decoratedProps);
      ctor.stringify = createSerializer(decoratedProps);
    };
  }
}
interface IItem {
  name: string;
  ctor: ISerializer<any>;
}

function createParser(props: IItem[]) {
  return new Function(
    AllConstructorsVar,
    `
return function(${readerArg}){
    return {
        ${props
      .map((prop, i) => {
        return `${prop.name}: ${AllConstructorsVar}.${getToken(prop.ctor)}.parse(${readerArg}.sliceNext(${readerArg}.collectNumber()))`;
      })
      .join(',\r\n\t\t')}
    };
}`
  )(AllConstructors) as (val: Reader) => any;
}

function stringifyHelper<T>(serializer: ISerializer<T>, val: T) {
  const valText = serializer.stringify(val);
  return `${valText.length}|${valText}`;
}

function createSerializer(arg: IItem[]) {
  return new Function(
    AllConstructorsVar,
    stringifyFn,
    `
return function (${valueArg}) {
  return [
    ${arg.map(generateStringifyCode).join(',\r\n    ')}
  ].join('');
};`
  )(AllConstructors, stringifyHelper) as (val: string) => any;
}

function generateStringifyCode(prop: IItem) {
  return `${stringifyFn}(${AllConstructorsVar}.${getToken(prop.ctor)}, ${toValueDotProp(prop)})`;
}

function toValueDotProp(item: IItem) {
  return `${valueArg}.${item.name}`;
}

function byName(a: any, b: any) {
  return a.name < b.name ? 1 : -1; // dont really care about decending or ascending, just that its sorted, and always in the same way
}
