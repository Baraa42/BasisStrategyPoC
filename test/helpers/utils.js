const { toWei } = require('web3-utils');
const { BN } = require('@openzeppelin/test-helpers/src/setup');

function assertRoughlyEqualValues (expected, actual, relativeDiff) {
    const expectedBN = toBN(expected);
    const actualBN = toBN(actual);

    let multiplerNumerator = relativeDiff;
    let multiplerDenominator = toBN('1');
    while (!Number.isInteger(multiplerNumerator)) {
        multiplerDenominator = multiplerDenominator.mul(toBN('10'));
        multiplerNumerator *= 10;
    }
    const diff = expectedBN.sub(actualBN).abs();
    const treshold = expectedBN.mul(toBN(multiplerNumerator)).div(multiplerDenominator);
    if (!diff.lte(treshold)) {
        expect(actualBN).to.be.bignumber.equal(expectedBN, `${actualBN} != ${expectedBN} with ${relativeDiff} precision`);
    }
}

function toBN (val) {
    return web3.utils.toBN(val);
}

function usdc (n) {
    return new BN(toWei(n, 'mwei'));
}

module.exports = {
    assertRoughlyEqualValues,
    toBN,
    usdc,
};
