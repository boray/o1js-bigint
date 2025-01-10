import { ZkProgram } from 'o1js';
import { BigInt384, BigInt2048 } from './BigInt.js';

let bigint384ZkProgram = ZkProgram({
    name: 'bigint-384-benchmark',
    methods: {
        add: {
            privateInputs: [BigInt384, BigInt384, BigInt384],
            async method(
                a: BigInt384,
                b: BigInt384,
                modulus: BigInt384
            ) {
                modulus.add(a, b);
            },
        },
        sub: {
            privateInputs: [BigInt384, BigInt384, BigInt384],
            async method(
                a: BigInt384,
                b: BigInt384,
                modulus: BigInt384
            ) {
                modulus.sub(a, b);
            },
        },
        mul: {
            privateInputs: [BigInt384, BigInt384, BigInt384],
            async method(
                a: BigInt384,
                b: BigInt384,
                modulus: BigInt384
            ) {
                modulus.mul(a, b);
            },
        },
        div: {
            privateInputs: [BigInt384, BigInt384, BigInt384],
            async method(
                a: BigInt384,
                b: BigInt384,
                modulus: BigInt384
            ) {
                modulus.div(a, b);
            },
        },
        mod: {
            privateInputs: [BigInt384, BigInt384],
            async method(
                a: BigInt384,
                modulus: BigInt384
            ) {
                modulus.mod(a);
            },
        },
    },
});

let bigint2048ZkProgram = ZkProgram({
    name: 'bigint-2048-benchmark',
    methods: {
        add: {
            privateInputs: [BigInt2048, BigInt2048, BigInt2048],
            async method(
                a: BigInt2048,
                b: BigInt2048,
                modulus: BigInt2048
            ) {
                modulus.add(a, b);
            },
        },
        sub: {
            privateInputs: [BigInt2048, BigInt2048, BigInt2048],
            async method(
                a: BigInt2048,
                b: BigInt2048,
                modulus: BigInt2048
            ) {
                modulus.sub(a, b);
            },
        },
        mul: {
            privateInputs: [BigInt2048, BigInt2048, BigInt2048],
            async method(
                a: BigInt2048,
                b: BigInt2048,
                modulus: BigInt2048
            ) {
                modulus.mul(a, b);
            },
        },
        div: {
            privateInputs: [BigInt2048, BigInt2048, BigInt2048],
            async method(
                a: BigInt2048,
                b: BigInt2048,
                modulus: BigInt2048
            ) {
                modulus.div(a, b);
            },
        },
        mod: {
            privateInputs: [BigInt2048, BigInt2048],
            async method(
                a: BigInt2048,
                modulus: BigInt2048
            ) {
                modulus.mod(a);
            },
        },
    },
});

console.time('compile');
await bigint384ZkProgram.compile();
await bigint2048ZkProgram.compile();
console.timeEnd('compile');

let BigInt384Summary = await bigint384ZkProgram.analyzeMethods();
let BigInt2048Summary = await bigint2048ZkProgram.analyzeMethods();

console.log(`-------------------------------------`);
console.log(`
    BigInt384 Summary

    |--------|------|
    | Method | Rows |
    |--------|------|
    |  add   | ${BigInt384Summary.add.rows}  |
    |--------|------|
    |  sub   | ${BigInt384Summary.sub.rows}  |
    |--------|------|
    |  mul   | ${BigInt384Summary.mul.rows}   |
    |--------|------|
    |  div   | ${BigInt384Summary.div.rows}  |
    |--------|------|
    |  mod   | ${BigInt384Summary.mod.rows}  |
    |--------|------|
    `);
console.log(`-------------------------------------`);
console.log(`
    BigInt2048 Summary

    |--------|------|
    | Method | Rows |
    |--------|------|
    |  add   | ${BigInt2048Summary.add.rows} |
    |--------|------|
    |  sub   | ${BigInt2048Summary.sub.rows}  |
    |--------|------|
    |  mul   | ${BigInt2048Summary.mul.rows}  |
    |--------|------|
    |  div   | ${BigInt2048Summary.div.rows} |
    |--------|------|
    |  mod   | ${BigInt2048Summary.mod.rows} |
    |--------|------|
    `);
console.log(`-------------------------------------`);