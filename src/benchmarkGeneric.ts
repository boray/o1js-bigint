import { ZkProgram } from 'o1js';
import { createBigIntClass, BigIntParams, BigIntParamList } from './BigIntGeneric.js';

function runCircuit(bits: string) {
    const params = BigIntParams[bits];
    if (!params) {
        throw new Error(`Unsupported bit size: ${bits}`);
    }
    const ProvableBigInt = createBigIntClass(params);
    return ZkProgram({
        name: 'bigint-benchmark',
        methods: {
            add: {
                privateInputs: [ProvableBigInt, ProvableBigInt, ProvableBigInt],
                async method(
                    a: InstanceType<typeof ProvableBigInt>,
                    b: InstanceType<typeof ProvableBigInt>,
                    modulus: InstanceType<typeof ProvableBigInt>
                ) {
                    modulus.add(a, b);
                },
            },
            sub: {
                privateInputs: [ProvableBigInt, ProvableBigInt, ProvableBigInt],
                async method(
                    a: InstanceType<typeof ProvableBigInt>,
                    b: InstanceType<typeof ProvableBigInt>,
                    modulus: InstanceType<typeof ProvableBigInt>
                ) {
                    modulus.sub(a, b);
                },
            },
            mul: {
                privateInputs: [ProvableBigInt, ProvableBigInt, ProvableBigInt],
                async method(
                    a: InstanceType<typeof ProvableBigInt>,
                    b: InstanceType<typeof ProvableBigInt>,
                    modulus: InstanceType<typeof ProvableBigInt>
                ) {
                    modulus.mul(a, b);
                },
            },
            div: {
                privateInputs: [ProvableBigInt, ProvableBigInt, ProvableBigInt],
                async method(
                    a: InstanceType<typeof ProvableBigInt>,
                    b: InstanceType<typeof ProvableBigInt>,
                    modulus: InstanceType<typeof ProvableBigInt>
                ) {
                    modulus.div(a, b);
                },
            },
            mod: {
                privateInputs: [ProvableBigInt, ProvableBigInt],
                async method(
                    a: InstanceType<typeof ProvableBigInt>,
                    modulus: InstanceType<typeof ProvableBigInt>
                ) {
                    modulus.mod(a);
                },
            },
        },
    });
}

let summary = [];

for (let i = 0; i < BigIntParamList.length; i++) {
    const BigIntSummary = await runCircuit(BigIntParamList[i]).analyzeMethods();
    const formattedSummary = {
        parameter: BigIntParamList[i],
        add: BigIntSummary.add.rows,
        sub: BigIntSummary.sub.rows,
        mul: BigIntSummary.mul.rows,
        div: BigIntSummary.div.rows,
        mod: BigIntSummary.mod.rows,
    };
    summary.push(formattedSummary);
}

console.log(summary);
