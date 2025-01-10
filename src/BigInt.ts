import { Bool, Field, Provable, Struct, Unconstrained, Gadgets } from 'o1js';

export { BigInt384, BigInt2048 };

// TODO: createBigInt function and fix modulo hell.

const params = {
  384: {
    limb_num: 6,
    limb_size: 64n,
    mask: (1n << 64n) - 1n,
    MAX: (1n << 384n) - 1n,
  },
  2048: {
    limb_num: 18,
    limb_size: 116n,
    mask: (1n << 116n) - 1n,
    MAX: (1n << 2088n) - 1n,
  },
};

class BigInt384 extends Struct({
  fields: Provable.Array(Field, params[384].limb_num),
  value: Unconstrained.withEmpty(0n),
}) {
  /*
    FORMULA:  
    fields[i] = limb_i
    x = limb_0 + limb_1 * 2^64 + limb_2 * 2^128 + limb_3 * 2^192 + limb_4 * 2^256 + limb_5 * 2^320
    */
  static fromBigint(x: bigint) {
    let fields = [];
    let value = x;
    if (x < 0n) {
      throw new Error('Input must be non-negative.');
    }
    if (x > params[384].MAX) {
      throw new Error('Input exceeds 384-bit size limit.');
    }
    for (let i = 0; i < params[384].limb_num; i++) {
      fields.push(Field.from(x & params[384].mask)); // fields[i] = x & 2^64 - 1
      x >>= params[384].limb_size; // x = x >> 64
    }
    return new BigInt384({ fields, value: Unconstrained.from(value) });
  }

  toBigint(): bigint {
    let result = 0n;
    for (let i = 0; i < params[384].limb_num; i++) {
      result |=
        BigInt(this.fields[i].toString()) <<
        (params[384].limb_size * BigInt(i)); // result = result | fields[i] << 64 * i
    }
    return result;
  }

  /*
    FORMULA:
    carry = 0;
    for i in 0..5:
      limb_rhs_i + limb_lhs_i + carry = sum_i
      carry = sum_i > 2^64 ? 1 : 0
      sum_i = sum_i % 2^64
    return sum[i], carry
    */
  add(a: BigInt384, b: BigInt384): BigInt384 {
    let fields: Field[] = [];
    let carry = Field.from(0);

    // limb-by-limb addition with carry propagation
    for (let i = 0; i < params[384].limb_num; i++) { // iterate over all limbs
      let sum = a.fields[i].add(b.fields[i]).add(carry); // sum = a + b + carry
      carry = sum.greaterThan(Field.from(params[384].mask)).toField(); // carry = sum > 2^64 ? 1 : 0
      fields.push(sum.sub(carry.mul(Field.from(params[384].mask + 1n)))); // sum = sum - carry * 2^64
      Gadgets.rangeCheck64(fields[i]); // range check the limb
    }
    // check if the result is overflowing modulo
    let isGreaterOrEqual = Bool(false); // isGreaterOrEqual = false
    for (let i = 0; i < params[384].limb_num; i++) { // iterate over all limbs
      let isGreater = fields[i].greaterThan(this.fields[i]); // isGreater = fields[i] > this.fields[i]
      let isEqual = fields[i].equals(this.fields[i]); // isEqual = fields[i] == this.fields[i]
      isGreaterOrEqual = isGreaterOrEqual
        .or(isGreater)
        .or(isEqual.and(isGreaterOrEqual)); // isGreaterOrEqual = isGreaterOrEqual || isGreater || (isEqual && isGreaterOrEqual)
    }

    // if the result is overflowing modulo, subtract the modulo ONCE
    // TODO: THIS PART IS NOT CORRECT
    // We need a loop here to subtract the modulo until the result is less than the modulo
    let borrow = Field.from(0); // borrow = 0
    for (let i = 0; i < params[384].limb_num; i++) { // iterate over all limbs
      let diff = fields[i]
        .sub(this.fields[i].mul(isGreaterOrEqual.toField()))
        .sub(borrow); // diff = fields[i] - this.fields[i] * isGreaterOrEqual - borrow
      borrow = diff.lessThan(Field.from(0)).toField(); // borrow = diff < 0 ? 1 : 0
      fields[i] = diff.add(borrow.mul(Field.from(params[384].mask + 1n))); // fields[i] = diff + borrow * 2^64
    }

    return new BigInt384({
      fields,
      value: Unconstrained.from(
        (a.value.get() + b.value.get()) % this.value.get()
      ),
    });
  }

  sub(a: BigInt384, b: BigInt384): BigInt384 {
    // TODO: We assume a > b
    let fields = [];
    let borrow = Field.from(0);
    for (let i = 0; i < params[384].limb_num; i++) { // iterate over all limbs
      let diff = a.fields[i].sub(b.fields[i]).sub(borrow); // diff = a.fields[i] - b.fields[i] - borrow
      borrow = diff.lessThan(Field.from(params[384].mask + 1n)).not().toField(); // borrow = diff < 2^64 ? 0 : 1
      fields.push(diff.add(borrow.mul(Field.from(params[384].mask + 1n)))); // fields[i] = diff + borrow * 2^64
      Gadgets.rangeCheck64(fields[i]); // range check the limb
    }

    return new BigInt384({
      fields,
      value: Unconstrained.from(
        (a.value.get() - b.value.get()) % this.value.get()
      ),
    });
  }

  mul(a: BigInt384, b: BigInt384): BigInt384 {
    // this function is borrowed form o1js/src/examples/crypto/rsa/rsa.ts
    let { q, r } = Provable.witness(
      Struct({ q: BigInt384, r: BigInt384 }),
      () => {
        let xy = a.toBigint() * b.toBigint();
        let p0 = this.toBigint();
        let q = xy / p0;
        let r = xy - q * p0;
        return { q: BigInt384.fromBigint(q), r: BigInt384.fromBigint(r) };
      }
    );

    let delta: Field[] = Array.from({ length: 2 * 6 - 1 }, () => Field(0));
    let [X, Y, Q, R, P] = [a.fields, b.fields, q.fields, r.fields, this.fields];

    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 6; j++) {
        delta[i + j] = delta[i + j].add(X[i].mul(Y[j]));
      }
      for (let j = 0; j < 6; j++) {
        delta[i + j] = delta[i + j].sub(Q[i].mul(P[j]));
      }
      delta[i] = delta[i].sub(R[i]).seal();
    }

    let carry = Field(0);

    for (let i = 0; i < 2 * 6 - 2; i++) {
      let deltaPlusCarry = delta[i].add(carry).seal();
      carry = Provable.witness(Field, () => deltaPlusCarry.div(1n << 64n));
      deltaPlusCarry.assertEquals(carry.mul(1n << 64n));
    }

    delta[2 * 6 - 2].add(carry).assertEquals(0n);

    return r;
  }

  div(
    a: BigInt384,
    b: BigInt384
  ): { quotient: BigInt384; remainder: BigInt384 } {
    let { q, r } = Provable.witness(
      Struct({ q: BigInt384, r: BigInt384 }),
      () => {
        let r = a.toBigint() % b.toBigint(); // r = a % b
        let q = (a.toBigint() - r) / b.toBigint(); // q = (a - r) / b
        return { q: BigInt384.fromBigint(q), r: BigInt384.fromBigint(r) }; // return quotient and remainder
      }
    );

    BigInt384.equals(this.add(this.mul(q, b), r), a).assertTrue(); // q * b + r % this == a % this

    return {
      quotient: q,
      remainder: r,
    };
  }

  mod(a: BigInt384): BigInt384 {
    return this.div(a, this).remainder; // a % this
  }

  static greaterThan(a: BigInt384, b: BigInt384): Bool {
    let result = Bool(false);
    for (let i = 0; i < params[384].limb_num; i++) { // iterate over all limbs
      let isGreater = a.fields[i].greaterThan(b.fields[i]); // a.fields[i] > b.fields[i]
      let isEqual = a.fields[i].equals(b.fields[i]); // a.fields[i] == b.fields[i]
      result = isGreater.or(result.and(isEqual)); // result = isGreater || (result && isEqual)
    }
    return result;
  }

  static greaterThanOrEqual(a: BigInt384, b: BigInt384): Bool {
    let result = Bool(false);
    for (let i = 0; i < params[384].limb_num; i++) { // iterate over all limbs
      let isGreater = a.fields[i].greaterThan(b.fields[i]); // a.fields[i] > b.fields[i]
      let isEqual = a.fields[i].equals(b.fields[i]); // a.fields[i] == b.fields[i]
      result = isGreater.or(result.and(isEqual)); // result = isGreater || (result && isEqual)
    }
    return result.or(BigInt384.equals(a, b)); // result || (a == b)
  }

  static lessThan(a: BigInt384, b: BigInt384): Bool {
    let result = Bool.fromValue(false);
    for (let i = 0; i < params[384].limb_num; i++) { // iterate over all limbs
      let isLess = a.fields[i].lessThan(b.fields[i]); // a.fields[i] < b.fields[i]
      let isEqual = a.fields[i].equals(b.fields[i]); // a.fields[i] == b.fields[i]
      result = isLess.or(result.and(isEqual)); // result = isLess || (result && isEqual)
    }
    return result;
  }

  static lessThanOrEqual(a: BigInt384, b: BigInt384): Bool {
    let result = Bool.fromValue(false);
    for (let i = 0; i < params[384].limb_num; i++) { // iterate over all limbs
      let isLess = a.fields[i].lessThan(b.fields[i]); // a.fields[i] < b.fields[i]
      let isEqual = a.fields[i].equals(b.fields[i]); // a.fields[i] == b.fields[i]
      result = isLess.or(result.and(isEqual)); // result = isLess || (result && isEqual)
    }
    return result.or(BigInt384.equals(a, b)); // result || (a == b)
  }

  static equals(a: BigInt384, b: BigInt384): Bool {
    return Provable.equal(BigInt384, a, b); // check fields are equal
  }
}



class BigInt2048 extends Struct({
  fields: Provable.Array(Field, params[2048].limb_num),
  value: Unconstrained.withEmpty(0n),
}) {

  static fromBigint(x: bigint) {
    let fields = [];
    let value = x;
    if (x < 0n) {
      throw new Error('Input must be non-negative.');
    }
    if (x > params[2048].MAX) {
      throw new Error('Input exceeds 2088-bit size limit.');
    }
    for (let i = 0; i < params[2048].limb_num; i++) {
      fields.push(Field.from(x & params[2048].mask));
      x >>= params[2048].limb_size;
    }
    return new BigInt2048({ fields, value: Unconstrained.from(value) });
  }

  toBigint(): bigint {
    let result = 0n;
    for (let i = 0; i < params[2048].limb_num; i++) {
      result |= BigInt(this.fields[i].toString()) << (params[2048].limb_size * BigInt(i));
    }
    return result;
  }

  add(a: BigInt2048, b: BigInt2048): BigInt2048 {
    let fields: Field[] = [];
    let carry = Field.from(0);

    for (let i = 0; i < params[2048].limb_num; i++) {
      let sum = a.fields[i].add(b.fields[i]).add(carry);
      carry = sum.greaterThan(Field.from(params[2048].mask)).toField();
      fields.push(sum.sub(carry.mul(Field.from(params[2048].mask + 1n))));
      rangeCheck116(fields[i]);
    }

    let isGreaterOrEqual = Bool(false);
    for (let i = 0; i < params[2048].limb_num; i++) {
      let isGreater = fields[i].greaterThan(this.fields[i]);
      let isEqual = fields[i].equals(this.fields[i]);
      isGreaterOrEqual = isGreaterOrEqual.or(isGreater).or(isEqual.and(isGreaterOrEqual));
    }

    let borrow = Field.from(0);
    for (let i = 0; i < params[2048].limb_num; i++) {
      let diff = fields[i].sub(this.fields[i].mul(isGreaterOrEqual.toField())).sub(borrow);
      borrow = diff.lessThan(Field.from(0)).toField();
      fields[i] = diff.add(borrow.mul(Field.from(params[2048].mask + 1n)));
    }

    return new BigInt2048({
      fields,
      value: Unconstrained.witness(
        () => (a.value.get() + b.value.get()) % this.value.get()
      ),
    });
  }

  sub(a: BigInt2048, b: BigInt2048): BigInt2048 {
    let fields = [];
    let borrow = Field.from(0);
    for (let i = 0; i < params[2048].limb_num; i++) {
      let diff = a.fields[i].sub(b.fields[i]).sub(borrow);
      borrow = diff.lessThan(Field.from(params[2048].mask + 1n)).not().toField();
      fields.push(diff.add(borrow.mul(Field.from(params[2048].mask + 1n))));
      rangeCheck116(fields[i]);
    }

    return new BigInt2048({
      fields,
      value: Unconstrained.witness(
        () => (a.value.get() - b.value.get()) % this.value.get()
      ),
    });
  }

  mul(a: BigInt2048, b: BigInt2048): BigInt2048 {
    let { q, r } = Provable.witness(
      Struct({ q: BigInt2048, r: BigInt2048 }),
      () => {
        let xy = a.toBigint() * b.toBigint();
        let p0 = this.toBigint();
        let q = xy / p0;
        let r = xy - q * p0;
        return { q: BigInt2048.fromBigint(q), r: BigInt2048.fromBigint(r) };
      }
    );

    let delta: Field[] = Array.from({ length: 2 * 18 - 1 }, () => Field(0));
    let [X, Y, Q, R, P] = [a.fields, b.fields, q.fields, r.fields, this.fields];

    for (let i = 0; i < 18; i++) {
      for (let j = 0; j < 18; j++) {
        delta[i + j] = delta[i + j].add(X[i].mul(Y[j]));
      }
      for (let j = 0; j < 18; j++) {
        delta[i + j] = delta[i + j].sub(Q[i].mul(P[j]));
      }
      delta[i] = delta[i].sub(R[i]).seal();
    }

    let carry = Field(0);

    for (let i = 0; i < 2 * 18 - 2; i++) {
      let deltaPlusCarry = delta[i].add(carry).seal();
      carry = Provable.witness(Field, () => deltaPlusCarry.div(1n << 116n));
      deltaPlusCarry.assertEquals(carry.mul(1n << 116n));
    }

    delta[2 * 18 - 2].add(carry).assertEquals(0n);

    return r;
  }

  div(
    a: BigInt2048,
    b: BigInt2048
  ): { quotient: BigInt2048; remainder: BigInt2048 } {
    let { q, r } = Provable.witness(
      Struct({ q: BigInt2048, r: BigInt2048 }),
      () => {
        let r = a.toBigint() % b.toBigint();
        let q = (a.toBigint() - r) / b.toBigint();
        return { q: BigInt2048.fromBigint(q), r: BigInt2048.fromBigint(r) };
      }
    );

    BigInt2048.equals(this.add(this.mul(q, b), r), a).assertTrue();

    return {
      quotient: q,
      remainder: r,
    };
  }

  mod(a: BigInt2048): BigInt2048 {
    return this.div(a, this).remainder;
  }

  static greaterThan(a: BigInt2048, b: BigInt2048): Bool {
    let result = Bool(false);
    for (let i = 0; i < params[2048].limb_num; i++) {
      let isGreater = a.fields[i].greaterThan(b.fields[i]);
      let isEqual = a.fields[i].equals(b.fields[i]);
      result = isGreater.or(result.and(isEqual));
    }
    return result;
  }

  static greaterThanOrEqual(a: BigInt2048, b: BigInt2048): Bool {
    let result = Bool(false);
    for (let i = 0; i < params[2048].limb_num; i++) {
      let isGreater = a.fields[i].greaterThan(b.fields[i]);
      let isEqual = a.fields[i].equals(b.fields[i]);
      result = isGreater.or(result.and(isEqual));
    }
    return result.or(BigInt2048.equals(a, b));
  }

  static lessThan(a: BigInt2048, b: BigInt2048): Bool {
    let result = Bool.fromValue(false);
    for (let i = 0; i < params[2048].limb_num; i++) {
      let isLess = a.fields[i].lessThan(b.fields[i]);
      let isEqual = a.fields[i].equals(b.fields[i]);
      result = isLess.or(result.and(isEqual));
    }
    return result;
  }

  static lessThanOrEqual(a: BigInt2048, b: BigInt2048): Bool {
    let result = Bool.fromValue(false);
    for (let i = 0; i < params[2048].limb_num; i++) {
      let isLess = a.fields[i].lessThan(b.fields[i]);
      let isEqual = a.fields[i].equals(b.fields[i]);
      result = isLess.or(result.and(isEqual));
    }
    return result.or(BigInt2048.equals(a, b));
  }

  static equals(a: BigInt2048, b: BigInt2048): Bool {
    return Provable.equal(BigInt2048, a, b);
  }
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