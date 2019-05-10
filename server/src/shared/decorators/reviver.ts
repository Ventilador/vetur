// TODO enhace function generation with hardcoded transformers
import { Thru } from '../serialization/thru';
import { ISerializer } from '../serialization/types';
const transformations = 'a';
const originalFn = 'b';
const cache: Record<'parse' | 'stringify', Record<number, Function>> = {
  parse: {},
  stringify: {}
};
const ready = Symbol('ready');
const argMap = Symbol('argMap');
const Base: any = function(amount: number) {
  while (baseProto.length <= amount) {
    baseProto[baseProto.length++] = Thru;
  }
};

const baseProto = (Base.prototype = Object.create(null));
baseProto.length = 0;
export const Reviver = makeDecorator('parse');
export const ToMove = makeDecorator('stringify');
function makeDecorator(mode: 'parse' | 'stringify') {
  return function Reviver<T>(ctor: ISerializer<T>) {
    return function(proto: any, name: string, index: number) {
      if (!proto[name][ready]) {
        proto[name][ready] = true;
        const original = proto[name] as Function;
        const transformers = (proto[name][argMap] = new Base(original.length));
        const wrapper = argWrapper(transformers, original, mode);
        proto[name] = function() {
          return wrapper.apply(null, arguments);
        };
      }

      proto[name][argMap][index] = ctor;
    };
  };
}

function argWrapper(transformers: any, original: Function, mode: 'parse' | 'stringify') {
  const size = original.length;
  if (!cache[mode][size]) {
    cache[mode][size] = createByMode(size, mode);
  }
  return cache[mode][size](transformers, original);
}

// Creates the following function
/**
 * function (transformations, originalFn){
 *      return function(){
 *          return originalFn.call(this,
 *                  transformations[0].parse(arguments[0]),
 *                  transformations[1].parse(arguments[1]),
 *                  transformations[2].parse(arguments[2]),
 *                  ...more
 *                  )
 *      }
 * }
 * var temp; // used to cache some accessors
 */
function createByMode(size: number, mode: 'parse' | 'stringify') {
  return new Function(
    originalFn,
    transformations,
    `
return function () {
    return ${originalFn}.call(this${Array.from(new Array(size)).map(
      (_, i) => `,
                    ${transformations}[${i}].${mode}(arguments[${i}])`
    )});
};`
  );
}
