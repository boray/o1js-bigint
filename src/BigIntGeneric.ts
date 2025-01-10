import { Bool, Field, Provable, Struct, Unconstrained, Gadgets } from 'o1js';

export { createBigIntClass, BigIntParams, BigIntParamList };

type BigIntParameter = {
    limb_num: number,
    limb_size: bigint,
    mask: bigint,
    MAX: bigint
}

const BigIntParams: { [key: string]: BigIntParameter } = {
    "384_12": {
        limb_num: 12,
        limb_size: 32n,
        mask: (1n << 32n) - 1n,
        MAX: (1n << 384n) - 1n,
    },
    "384_9": {
        limb_num: 9,
        limb_size: 48n,
        mask: (1n << 48n) - 1n,
        MAX: (1n << 384n) - 1n,
    },
    "384_6": {
        limb_num: 6,
        limb_size: 64n,
        mask: (1n << 64n) - 1n,
        MAX: (1n << 384n) - 1n,
    },
    "384_3": {
        limb_num: 3,
        limb_size: 128n,
        mask: (1n << 128n) - 1n,
        MAX: (1n << 384n) - 1n,
    },
    "384_2": {
        limb_num: 2,
        limb_size: 192n,
        mask: (1n << 192n) - 1n,
        MAX: (1n << 384n) - 1n,
    },
    "512_16": {
        limb_num: 16,
        limb_size: 32n,
        mask: (1n << 32n) - 1n,
        MAX: (1n << 512n) - 1n,
    },
    "512_8": {
        limb_num: 8,
        limb_size: 64n,
        mask: (1n << 64n) - 1n,
        MAX: (1n << 512n) - 1n,
    },
    "512_4": {
        limb_num: 4,
        limb_size: 128n,
        mask: (1n << 128n) - 1n,
        MAX: (1n << 512n) - 1n,
    },
    "576_9": {
        limb_num: 9,
        limb_size: 64n,
        mask: (1n << 64n) - 1n,
        MAX: (1n << 512n) - 1n,
    },
    "1024_16": {
        limb_num: 16,
        limb_size: 64n,
        mask: (1n << 64n) - 1n,
        MAX: (1n << 1024n) - 1n,
    },
    "1024_8": {
        limb_num: 8,
        limb_size: 128n,
        mask: (1n << 128n) - 1n,
        MAX: (1n << 1024n) - 1n,
    },
    "2048_18": {
        limb_num: 18,
        limb_size: 116n,
        mask: (1n << 116n) - 1n,
        MAX: (1n << 2088n) - 1n,
    },
    "2048_16": {
        limb_num: 16,
        limb_size: 64n,
        mask: (1n << 64n) - 1n,
        MAX: (1n << 2048n) - 1n,
    },
    "2048_8": {
        limb_num: 8,
        limb_size: 128n,
        mask: (1n << 128n) - 1n,
        MAX: (1n << 2048n) - 1n,
    },
};

const BigIntParamList: string[] = Object.keys(BigIntParams);

function createBigIntClass(params: BigIntParameter) {
    return class ProvableBigInt extends Struct({
        fields: Provable.Array(Field, params.limb_num),
        value: Unconstrained.withEmpty(0n),
    }) {
        static fromBigint(x: bigint) {
            let fields = [];
            let value = x;
            if (x < 0n) {
                throw new Error('Input must be non-negative.');
            }
            if (x > params.MAX) {
                throw new Error(`Input exceeds ${params.limb_num * Number(params.limb_size)}-bit size limit.`);
            }
            for (let i = 0; i < params.limb_num; i++) {
                fields.push(Field.from(x & params.mask)); // fields[i] = x & 2^64 - 1
                x >>= params.limb_size; // x = x >> 64
            }
            return new ProvableBigInt({ fields, value: Unconstrained.from(value) });
        }

        toBigint(): bigint {
            let result = 0n;
            for (let i = 0; i < params.limb_num; i++) {
                result |=
                    BigInt(this.fields[i].toString()) <<
                    (params.limb_size * BigInt(i)); // result = result | fields[i] << 64 * i
            }
            return result;
        }

        add(a: ProvableBigInt, b: ProvableBigInt): ProvableBigInt {
            let fields: Field[] = [];
            let carry = Field.from(0);

            for (let i = 0; i < params.limb_num; i++) {
                let sum = a.fields[i].add(b.fields[i]).add(carry);
                carry = sum.greaterThan(Field.from(params.mask)).toField();
                fields.push(sum.sub(carry.mul(Field.from(params.mask + 1n))));
                rangeCheck(fields[i], Number(params.limb_size));
            }

            let isGreaterOrEqual = Bool(false);
            for (let i = 0; i < params.limb_num; i++) {
                let isGreater = fields[i].greaterThan(this.fields[i]);
                let isEqual = fields[i].equals(this.fields[i]);
                isGreaterOrEqual = isGreaterOrEqual.or(isGreater).or(isEqual.and(isGreaterOrEqual));
            }

            let borrow = Field.from(0);
            for (let i = 0; i < params.limb_num; i++) {
                let diff = fields[i].sub(this.fields[i].mul(isGreaterOrEqual.toField())).sub(borrow);
                borrow = diff.lessThan(Field.from(0)).toField();
                fields[i] = diff.add(borrow.mul(Field.from(params.mask + 1n)));
            }

            return new ProvableBigInt({
                fields,
                value: Unconstrained.witness(
                    () => (a.value.get() + b.value.get()) % this.value.get()
                ),
            });
        }

        sub(a: ProvableBigInt, b: ProvableBigInt): ProvableBigInt {
            let fields = [];
            let borrow = Field.from(0);
            for (let i = 0; i < params.limb_num; i++) {
                let diff = a.fields[i].sub(b.fields[i]).sub(borrow);
                borrow = diff.lessThan(Field.from(params.mask + 1n)).not().toField();
                fields.push(diff.add(borrow.mul(Field.from(params.mask + 1n))));
                rangeCheck(fields[i], Number(params.limb_size));
            }

            return new ProvableBigInt({
                fields,
                value: Unconstrained.witness(
                    () => (a.value.get() - b.value.get()) % this.value.get()
                ),
            });
        }

        mul(a: ProvableBigInt, b: ProvableBigInt): ProvableBigInt {
            let { q, r } = Provable.witness(
                Struct({ q: ProvableBigInt, r: ProvableBigInt }),
                () => {
                    let xy = a.toBigint() * b.toBigint();
                    let p0 = this.toBigint();
                    let q = xy / p0;
                    let r = xy - q * p0;
                    return { q: ProvableBigInt.fromBigint(q), r: ProvableBigInt.fromBigint(r) };
                }
            );

            let delta: Field[] = Array.from({ length: 2 * params.limb_num - 1 }, () => Field(0));
            let [X, Y, Q, R, P] = [a.fields, b.fields, q.fields, r.fields, this.fields];

            for (let i = 0; i < params.limb_num; i++) {
                for (let j = 0; j < params.limb_num; j++) {
                    delta[i + j] = delta[i + j].add(X[i].mul(Y[j]));
                }
                for (let j = 0; j < params.limb_num; j++) {
                    delta[i + j] = delta[i + j].sub(Q[i].mul(P[j]));
                }
                delta[i] = delta[i].sub(R[i]).seal();
            }

            let carry = Field(0);

            for (let i = 0; i < 2 * params.limb_num - 2; i++) {
                let deltaPlusCarry = delta[i].add(carry).seal();
                carry = Provable.witness(Field, () => deltaPlusCarry.div(1n << params.limb_size));
                deltaPlusCarry.assertEquals(carry.mul(1n << params.limb_size));
            }

            delta[2 * params.limb_num - 2].add(carry).assertEquals(0n);

            return r;
        }

        div(
            a: ProvableBigInt,
            b: ProvableBigInt
        ): { quotient: ProvableBigInt; remainder: ProvableBigInt } {
            let { q, r } = Provable.witness(
                Struct({ q: ProvableBigInt, r: ProvableBigInt }),
                () => {
                    let r = a.toBigint() % b.toBigint();
                    let q = (a.toBigint() - r) / b.toBigint();
                    return { q: ProvableBigInt.fromBigint(q), r: ProvableBigInt.fromBigint(r) };
                }
            );

            ProvableBigInt.equals(this.add(this.mul(q, b), r), a).assertTrue();

            return {
                quotient: q,
                remainder: r,
            };
        }

        mod(a: ProvableBigInt): ProvableBigInt {
            return this.div(a, this).remainder;
        }

        static greaterThan(a: ProvableBigInt, b: ProvableBigInt): Bool {
            let result = Bool(false);
            for (let i = 0; i < params.limb_num; i++) {
                let isGreater = a.fields[i].greaterThan(b.fields[i]);
                let isEqual = a.fields[i].equals(b.fields[i]);
                result = isGreater.or(result.and(isEqual));
            }
            return result;
        }

        static greaterThanOrEqual(a: ProvableBigInt, b: ProvableBigInt): Bool {
            let result = Bool(false);
            for (let i = 0; i < params.limb_num; i++) {
                let isGreater = a.fields[i].greaterThan(b.fields[i]);
                let isEqual = a.fields[i].equals(b.fields[i]);
                result = isGreater.or(result.and(isEqual));
            }
            return result.or(ProvableBigInt.equals(a, b));
        }

        static lessThan(a: ProvableBigInt, b: ProvableBigInt): Bool {
            let result = Bool.fromValue(false);
            for (let i = 0; i < params.limb_num; i++) {
                let isLess = a.fields[i].lessThan(b.fields[i]);
                let isEqual = a.fields[i].equals(b.fields[i]);
                result = isLess.or(result.and(isEqual));
            }
            return result;
        }

        static lessThanOrEqual(a: ProvableBigInt, b: ProvableBigInt): Bool {
            let result = Bool.fromValue(false);
            for (let i = 0; i < params.limb_num; i++) {
                let isLess = a.fields[i].lessThan(b.fields[i]);
                let isEqual = a.fields[i].equals(b.fields[i]);
                result = isLess.or(result.and(isEqual));
            }
            return result.or(ProvableBigInt.equals(a, b));
        }

        static equals(a: ProvableBigInt, b: ProvableBigInt): Bool {
            return Provable.equal(ProvableBigInt, a, b);
        }
    };
}

function rangeCheck(x: Field, bits: number) {
    switch (bits) {
        case 32:
            Gadgets.rangeCheck32(x);
            break;
        case 48:
            rangeCheck48(x);
            break;
        case 64:
            Gadgets.rangeCheck64(x);
            break;
        case 116:
            rangeCheck116(x);
            break;
        case 128:
            rangeCheck128(x);
            break;
        case 192:
            rangeCheck192(x);
            break;
    }
}


function rangeCheck48(x: Field) {
    let [x0, x1] = Provable.witnessFields(2, () => [
        x.toBigInt() & ((1n << 32n) - 1n),
        x.toBigInt() >> 32n,
    ]);

    Gadgets.rangeCheck32(x0);
    Gadgets.rangeCheck16(x1);
    x0.add(x1.mul(1n << 32n)).assertEquals(x);
}

/**
* Borrowed from rsa.ts
* Custom range check for a single limb, x in [0, 2^116)
*/
function rangeCheck116(x: Field) {
    let [x0, x1] = Provable.witnessFields(2, () => [
        x.toBigInt() & ((1n << 64n) - 1n),
        x.toBigInt() >> 64n,
    ]);

    Gadgets.rangeCheck64(x0);
    let [x52] = Gadgets.rangeCheck64(x1);
    x52.assertEquals(0n); // => x1 is 52 bits
    // 64 + 52 = 116
    x0.add(x1.mul(1n << 64n)).assertEquals(x);
}

function rangeCheck128(x: Field) {
    let [x0, x1] = Provable.witnessFields(2, () => [
        x.toBigInt() & ((1n << 64n) - 1n),
        x.toBigInt() >> 64n,
    ]);

    Gadgets.rangeCheck64(x0);
    Gadgets.rangeCheck64(x1);
    x0.add(x1.mul(1n << 64n)).assertEquals(x);
}

function rangeCheck192(x: Field) {
    let [x0, x1, x2] = Provable.witnessFields(3, () => [
        x.toBigInt() & ((1n << 64n) - 1n), // first 64 bits
        (x.toBigInt() >> 64n) & ((1n << 64n) - 1n), // second 64 bits
        x.toBigInt() >> 128n, // third 64 bits
    ]);

    Gadgets.rangeCheck64(x0);
    Gadgets.rangeCheck64(x1);
    Gadgets.rangeCheck64(x2);
    x0.add(x1.mul(1n << 64n)).add(x2.mul(1n << 128n)).assertEquals(x);
}