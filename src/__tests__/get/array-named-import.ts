import { get } from "lodash";

const foo = {};
const baz = 'somekey';

const a = get(foo, ['a', 'b', 'c', 'd', 'e']);
const b = get(foo, ['a', '0', 'c', '5', 'e']);
const c = get(foo, ['a', 0, 'c', 5, 'e']);
const d = get(foo, `a[0].c.[${baz}].e`);

export { a, b, c, d };
