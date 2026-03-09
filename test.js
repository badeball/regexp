// console.log(/foo (bar (?<baz>baz))/.exec("foo bar baz"));

// const iterable = [1, 2].values();

// for (const n of iterable) {
//   console.log(n);
//   console.log(iterable.next());
// }

// const values = [1, 2];

// const myIterable = {
//   [Symbol.iterator]() {
//     let position = 0;
//     return {
//       next() {
//         if (position < values.length) {
//           return {
//             done: false,
//             value: values[position++],
//           };
//         } else {
//           return {
//             done: true,
//             value: values[position],
//           };
//         }
//       },
//     };
//   },
// };

// for (const n of myIterable) {
//   console.log(n);
//   console.log(myIterable.next());
// }
