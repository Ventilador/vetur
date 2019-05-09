import { ISerializer } from '../serialization/types';
import { Reader } from '../parser';
import { getToken, AllConstructors } from './serializersSingleton';

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
    'AllConstructors',
    `
return function(reader){
    var ${props.map((_, i) => `n${i}=reader.collectNumber();`).join('\r\n\t')}
    return {
        ${props
          .map((prop, i) => {
            return `${prop.name}: v${i}.parse(reader.sliceNext(n${i}))`;
          })
          .join(',\r\n\t\t')}
    };
}`
  )(AllConstructors) as (val: Reader) => any;
}

function createSerializer(arg: IItem[]) {
  const declareContent = `var content = [${arg.map(toValueDotProp).map(wrapWithAllConstructors, arg)}].join('|');`;
  return new Function(
    'AllConstructors',
    `
return function (value) {
    ${declareContent}
    return content.length + '|' + content;
};`
  )(AllConstructors) as (val: string) => any;
}
function wrapWithAllConstructors(this: IItem[], valueDotProp: string, index: number) {
  return `AllConstructors.${getToken(this[index].ctor)}(${valueDotProp})`;
}
function toValueDotProp(item: IItem) {
  return 'value.' + item.name;
}
function toCtor(item: any) {
  return item.ctor;
}
function createTokens(args: any[]) {
  return args.map((_, i) => 'v' + i);
}

function byName(a: any, b: any) {
  return a.name < b.name ? 1 : -1; // dont really care about decending or ascending, just that its sorted, and always in the same way
}
