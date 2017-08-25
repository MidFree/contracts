/* global it */
const MidFreeCoin = artifacts.require('MidFreeCoin.sol');

contract('MidFreeCoin', (accounts) => {
  // noinspection Annotator
  it('should put 0 MidFreeCoin in the first account', () => MidFreeCoin.deployed().then(
    instance => (
      instance.balanceOf.call(accounts[0])
    ),
  ).then(
    (balance) => {
        assert.equal(balance.valueOf() / (10 ** 18), 0, `wrong token amount: ${balance.valueOf()}`);
    }),
  );
});