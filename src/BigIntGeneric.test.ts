import { createBigIntClass, BigIntParams  } from './BigIntGeneric.js';

describe('BigInt384', () => {
  const BigInt384 = createBigIntClass(BigIntParams["384_3"]);

  describe('Creation and Conversion', () => {
    it('should correctly create a BigInt384 instance from a bigint and convert back to bigint', () => {
      const value = 1234567890123456789012345678901234567890n;
      const bigInt = BigInt384.fromBigint(value);
      expect(bigInt.toBigint()).toStrictEqual(value);
    });

    it('should fail to create a BigInt384 instance from a negative number', () => {
      const value = -1234567890123456789012345678901234567890n;
      expect(() => { BigInt384.fromBigint(value) }).toThrow('Input must be non-negative');
    });

    it('should fail to create a BigInt384 instance from a bigint larger than 384-bit', () => {
      const value = 1n << 386n;
      expect(() => { BigInt384.fromBigint(value) }).toThrow('Input exceeds 384-bit size limit.');
    });
  });

  describe('Addition', () => {
    it('should correctly add two BigInt384 numbers', () => {
      const modulo = BigInt384.fromBigint(2n ** 384n - 1n);
      const a = BigInt384.fromBigint(1234567890123456789012345678901234567890n);
      const b = BigInt384.fromBigint(987654321098765432109876543210987654321n);
      const result = modulo.add(a, b);
      expect(result.toBigint()).toStrictEqual(
        2222222211222222221122222222112222222211n
      );
    });

    it('should correctly add two BigInt384 numbers with small modulo', () => {
      const modulo = BigInt384.fromBigint(11n);
      const a = BigInt384.fromBigint(5n);
      const b = BigInt384.fromBigint(7n);
      const result = modulo.add(a, b);
      expect(result.toBigint()).toStrictEqual(1n);
    });

    it('should correctly add two BigInt384 numbers with big modulo', () => {
      const modulo = BigInt384.fromBigint((2n ** 384n) - 1n);
      const a = BigInt384.fromBigint((2n ** 381n) - 1n);
      const b = BigInt384.fromBigint((2n ** 381n) - 1n);
      const result = modulo.add(a, b);
      const expected = ((2n ** 381n - 1n) + (2n ** 381n - 1n)) % ((2n ** 384n) - 1n);
      expect(result.toBigint()).toStrictEqual(expected);
    });

    it('should correctly add two maximum BigInt384 numbers', () => {
      const modulo = BigInt384.fromBigint(2n ** 381n);
      const a = BigInt384.fromBigint(2n ** 381n - 1n);
      const b = BigInt384.fromBigint(2n ** 381n - 1n);
      const result = modulo.add(a, b);
      expect(result.toBigint()).toStrictEqual(
        (2n ** 381n - 1n + (2n ** 381n - 1n)) % 2n ** 381n
      );
    });

    it('should correctly add two BigInt384 numbers with brainpoolP384r1 modulus', () => {
      const brainpoolP384r1Modulus = 0x8cb91e82a3386d280f5d6f7e50e641df152f7109ed5456b412b1da197fb71123acd3a729901d1a71874700133107ec53n;
      const modulo = BigInt384.fromBigint(brainpoolP384r1Modulus);
      const a = BigInt384.fromBigint(modulo.toBigint() - 1n);
      const b = BigInt384.fromBigint(modulo.toBigint() - 1n);
      const result = modulo.add(a, b);
      const expected = ((modulo.toBigint() - 1n) + (modulo.toBigint() - 1n)) % modulo.toBigint();
      expect(result.toBigint()).toStrictEqual(expected);
    });

    it('should correctly add two BigInt384 numbers with small number modulo', () => {
      const modulo = BigInt384.fromBigint(11n);
      const a = BigInt384.fromBigint(7n);
      const b = BigInt384.fromBigint(6n);
      const result = modulo.add(a, b);
      expect(result.toBigint()).toStrictEqual(2n);
    });

    it('should correctly add two BigInt384 numbers with large number modulo', () => {
      const modulo =
        BigInt384.fromBigint(99987654321098765432109876543210987654321n);
      const a = BigInt384.fromBigint(1234567890123456789012345678901234567890n);
      const b = BigInt384.fromBigint(987654321098765432109876543210987654321n);
      const result = modulo.add(a, b);
      expect(result.toBigint()).toStrictEqual(
        (1234567890123456789012345678901234567890n +
          987654321098765432109876543210987654321n) %
        99987654321098765432109876543210987654321n
      );
    });

    it('should satisfy commutativity of addition for BigInt384 numbers', () => {
      const modulo = BigInt384.fromBigint(2n ** 384n - 1n);
      const a = BigInt384.fromBigint(1234567890123456789012345678901234567890n);
      const b = BigInt384.fromBigint(987654321098765432109876543210987654321n);
      expect(
        BigInt384.equals(modulo.add(a, b), modulo.add(b, a)).toBoolean()
      ).toStrictEqual(true);
    });

    it('should satisfy addition with identity element for BigInt384 numbers', () => {
      const modulo = BigInt384.fromBigint(2n ** 384n - 1n);
      const a = BigInt384.fromBigint(1234567890123456789012345678901234567890n);
      const b = BigInt384.fromBigint(0n);
      expect(modulo.add(a, b)).toStrictEqual(a);
    });

    it('should satisfy associativity of addition for BigInt384 numbers', () => {
      const modulo = BigInt384.fromBigint(2n ** 384n - 1n);
      const a = BigInt384.fromBigint(1234567890123456789012345678901234567890n);
      const b = BigInt384.fromBigint(987654321098765432109876543210987654321n);
      const c = BigInt384.fromBigint(111111111111111111111111111111111111111n);
      expect(
        BigInt384.equals(
          modulo.add(modulo.add(a, b), c),
          modulo.add(a, modulo.add(b, c))
        ).toBoolean()
      ).toStrictEqual(true);
    });
  });

  describe('Subtraction', () => {
    it('should correctly subtract two BigInt384 numbers', () => {
      const modulo = BigInt384.fromBigint(2n ** 384n - 1n);
      const a = BigInt384.fromBigint(1234567890123456789012345678901234567890n);
      const b = BigInt384.fromBigint(987652109876543210987654321n);
      const result = modulo.sub(a, b);
      expect(result.toBigint()).toStrictEqual(
        1234567890123456789012345678901234567890n - 987652109876543210987654321n
      );
    });

    it('should satisfy subtraction with identity element for BigInt384 numbers', () => {
      const modulo = BigInt384.fromBigint(2n ** 384n - 1n);
      const a = BigInt384.fromBigint(1234567890123456789012345678901234567890n);
      const b = BigInt384.fromBigint(0n);
      expect(modulo.sub(a, b)).toStrictEqual(a);
    });
  });

  describe('Multiplication', () => {
    it('should correctly multiply two BigInt384 numbers', () => {
      const modulo = BigInt384.fromBigint(2n ** 384n - 1n);
      const a = BigInt384.fromBigint(1234567890123456789n);
      const b = BigInt384.fromBigint(9876n);
      const result = modulo.mul(a, b);
      expect(result.toBigint()).toStrictEqual(
        BigInt(1234567890123456789n * 9876n)
      );
    });

    it('should correctly multiply two BigInt384 numbers with small values', () => {
      const modulo = BigInt384.fromBigint(2n ** 384n - 1n);
      const a = BigInt384.fromBigint(300n);
      const b = BigInt384.fromBigint(6n);
      const result = modulo.mul(a, b);
      expect(result.toBigint()).toStrictEqual(BigInt(300n * 6n) % 2n ** 384n);
    });

    it('should satisfy multiplication with identity element for BigInt384 numbers', () => {
      const modulo = BigInt384.fromBigint(2n ** 384n - 1n);
      const a = BigInt384.fromBigint(1234567890123456789012345678901234567890n);
      const b = BigInt384.fromBigint(1n);
      expect(modulo.mul(a, b)).toStrictEqual(a);
    });

    it('should satisfy multiplication with zero for BigInt384 numbers', () => {
      const modulo = BigInt384.fromBigint(2n ** 384n - 1n);
      const a = BigInt384.fromBigint(1234567890123456789012345678901234567890n);
      const b = BigInt384.fromBigint(0n);
      expect(modulo.mul(a, b)).toStrictEqual(b);
    });

    it('should satisfy multiplication with zero commuted for BigInt384 numbers', () => {
      const modulo = BigInt384.fromBigint(2n ** 384n - 1n);
      const a = BigInt384.fromBigint(1234567890123456789012345678901234567890n);
      const b = BigInt384.fromBigint(0n);
      expect(modulo.mul(a, b)).toStrictEqual(b);
    });

    it('should satisfy commutativity of multiplication for BigInt384 numbers', () => {
      const modulo = BigInt384.fromBigint(2n ** 384n - 1n);
      const a = BigInt384.fromBigint(1234567890123456789n);
      const b = BigInt384.fromBigint(9876n);
      expect(
        BigInt384.equals(modulo.mul(a, b), modulo.mul(b, a)).toBoolean()
      ).toStrictEqual(true);
    });

    it('should satisfy associativity of multiplication for BigInt384 numbers', () => {
      const modulo = BigInt384.fromBigint(2n ** 384n - 1n);
      const a = BigInt384.fromBigint(123n);
      const b = BigInt384.fromBigint(21346n);
      const c = BigInt384.fromBigint(987n);
      expect(
        BigInt384.equals(
          modulo.mul(a, modulo.mul(b, c)),
          modulo.mul(modulo.mul(a, b), c)
        ).toBoolean()
      ).toStrictEqual(true);
    });

    it('should satisfy distributivity of multiplication over addition for BigInt384 numbers', () => {
      const modulo = BigInt384.fromBigint(2n ** 384n - 1n);
      const a = BigInt384.fromBigint(123n);
      const b = BigInt384.fromBigint(21346n);
      const c = BigInt384.fromBigint(987n);
      expect(
        BigInt384.equals(
          modulo.mul(a, modulo.add(b, c)),
          modulo.add(modulo.mul(a, b), modulo.mul(a, c))
        ).toBoolean()
      ).toStrictEqual(true);
    });
  });

  describe('Division and Modulus', () => {
    it('should correctly divide two BigInt384 numbers', () => {
      const modulo = BigInt384.fromBigint(2n ** 384n - 1n);
      const a = BigInt384.fromBigint(10n);
      const b = BigInt384.fromBigint(3n);
      const result = modulo.div(a, b);
      expect(result.quotient.toBigint()).toStrictEqual(3n);
      expect(result.remainder.toBigint()).toStrictEqual(1n);
    });

    it('should satisfy division with identity element for BigInt384 numbers', () => {
      const modulo = BigInt384.fromBigint(2n ** 384n - 1n);
      const a = BigInt384.fromBigint(9876543210987654321n);
      const b = BigInt384.fromBigint(1n);
      const result = modulo.div(a, b);
      expect(result.quotient).toStrictEqual(a);
      expect(result.remainder.toBigint()).toStrictEqual(0n);
    });

    it('should correctly compute the modulus of a BigInt384 number with respect to another BigInt384 number', () => {
      const modulo = BigInt384.fromBigint(10n);
      const result = modulo.mod(BigInt384.fromBigint(17n));
      expect(result.toBigint()).toStrictEqual(7n);
    });
  });

  describe('Square root', () => {
    it('should correctly take square root of a ProvableBigInt', () => {
      const modulo = BigInt384.fromBigint(13n);
      const a = BigInt384.fromBigint(9n);
      const result = modulo.sqrt(a);
      expect(result.toBigint()).toStrictEqual(3n);
    });

    it('should correctly take square root of 0', () => {
      const modulo = BigInt384.fromBigint(13n);
      const a = BigInt384.fromBigint(0n);
      const result = modulo.sqrt(a);
      expect(result.toBigint()).toStrictEqual(0n);
    });

    it('should correctly take square root of a non-residue', () => {
      const modulo = BigInt384.fromBigint(13n);
      const a = BigInt384.fromBigint(2n);
      expect(() => modulo.sqrt(a)).toThrow();
    });

    it('should correctly take square root of a large number', () => {
      const modulo = BigInt384.fromBigint(104729n); // A large prime number
      const a = BigInt384.fromBigint(104728n); // 104728 is a quadratic residue modulo 104729
      const result = modulo.sqrt(a);
      expect(result.toBigint() * result.toBigint() % 104729n).toStrictEqual(a.toBigint() % 104729n)
    });

  });

  describe('Negate', () => {
    it('should correctly compute the additive inverse of a ProvableBigInt', () => {
      const modulo = BigInt384.fromBigint(13n);
      const a = BigInt384.fromBigint(9n);
      const result = modulo.negate(a);
      expect(result.toBigint()).toStrictEqual(4n); // 13 - 9 = 4
    });
  
    it('should correctly compute the additive inverse of 0', () => {
      const modulo = BigInt384.fromBigint(13n);
      const a = BigInt384.fromBigint(0n);
      const result = modulo.negate(a);
      expect(result.toBigint()).toStrictEqual(0n); // 13 - 0 = 0
    });
  
    it('should correctly compute the additive inverse of a large number', () => {
      const modulo = BigInt384.fromBigint(104729n); // A large prime number
      const a = BigInt384.fromBigint(104728n);
      const result = modulo.negate(a);
      expect(result.toBigint()).toStrictEqual(1n); // 104729 - 104728 = 1
    });
  });

  describe('Inverse', () => {
    it('should correctly compute the modular inverse of a ProvableBigInt', () => {
      const modulo = BigInt384.fromBigint(13n);
      const a = BigInt384.fromBigint(2n);
      const result = modulo.inverse(a);
      expect(result.toBigint()).toStrictEqual(7n); // 2 * 7 ≡ 1 (mod 13)
    });
  
    it('should correctly compute the modular inverse of 1', () => {
      const modulo = BigInt384.fromBigint(13n);
      const a = BigInt384.fromBigint(1n);
      const result = modulo.inverse(a);
      expect(result.toBigint()).toStrictEqual(1n); // 1 * 1 ≡ 1 (mod 13)
    });
  
    it('should correctly compute the modular inverse of a large number', () => {
      const modulo = BigInt384.fromBigint(104729n); // A large prime number
      const a = BigInt384.fromBigint(104728n);
      const result = modulo.inverse(a);
      expect(result.toBigint()).toStrictEqual(104728n); // 104728 * 104728 ≡ 1 (mod 104729)
    });
  });

  describe('Power', () => {
    it('should correctly compute the power of a ProvableBigInt with exponent 0', () => {
      const modulo = BigInt384.fromBigint(13n);
      const base = BigInt384.fromBigint(5n);
      const exponent = BigInt384.fromBigint(0n);
      const result = modulo.pow(base, exponent);
      expect(result.toBigint()).toStrictEqual(1n); // 5^0 ≡ 1 (mod 13)
    });

    it('should correctly compute the power of a ProvableBigInt with exponent 1', () => {
      const modulo = BigInt384.fromBigint(13n);
      const base = BigInt384.fromBigint(5n);
      const exponent = BigInt384.fromBigint(1n);
      const result = modulo.pow(base, exponent);
      expect(result.toBigint()).toStrictEqual(5n); // 5^1 ≡ 5 (mod 13)
    });

    it('should correctly compute the power of a ProvableBigInt with a small exponent', () => {
      const modulo = BigInt384.fromBigint(13n);
      const base = BigInt384.fromBigint(5n);
      const exponent = BigInt384.fromBigint(3n);
      const result = modulo.pow(base, exponent);
      expect(result.toBigint()).toStrictEqual(8n); // 5^3 ≡ 125 ≡ 8 (mod 13)
    });

    it('should correctly compute the power of a ProvableBigInt with a large exponent', () => {
      const modulo = BigInt384.fromBigint(104729n); // A large prime number
      const base = BigInt384.fromBigint(2n);
      const exponent = BigInt384.fromBigint(1000n);
      const result = modulo.pow(base, exponent);
      expect(result.toBigint()).toStrictEqual(4096n); // 2^1000 % 104729
    });

    it('should correctly compute the power of a ProvableBigInt with a large base and exponent', () => {
      const modulo = BigInt384.fromBigint(104729n); // A large prime number
      const base = BigInt384.fromBigint(104728n);
      const exponent = BigInt384.fromBigint(104728n);
      const result = modulo.pow(base, exponent);
      expect(result.toBigint()).toStrictEqual(1n); // 104728^104728 % 104729
    });
  });

  describe('Comparison', () => {
    it('should correctly compare two BigInt384 numbers', () => {
      const a = BigInt384.fromBigint(1234567890123456789012345678901234567890n);
      const b = BigInt384.fromBigint(987654321098765432109876543210987654321n);
      expect(BigInt384.greaterThan(a, b).toBoolean()).toStrictEqual(true);
      expect(BigInt384.greaterThanOrEqual(a, b).toBoolean()).toStrictEqual(
        true
      );
      expect(BigInt384.lessThan(a, b).toBoolean()).toStrictEqual(false);
      expect(BigInt384.lessThanOrEqual(a, b).toBoolean()).toStrictEqual(false);
      expect(BigInt384.equals(a, b).toBoolean()).toStrictEqual(false);
    });

    it('should correctly check equality of two BigInt384 numbers', () => {
      const a = BigInt384.fromBigint(1234567890123456789012345678901234567890n);
      const b = BigInt384.fromBigint(1234567890123456789012345678901234567890n);
      expect(BigInt384.equals(a, b).toBoolean()).toStrictEqual(true);
    });
  });
});
