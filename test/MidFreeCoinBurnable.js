import ether from '../utilities/ether';
import EVMThrow from './helpers/EVMThrow';

import { MidFreeCoin, MidFreeCoinCrowdsale, should, cap, tokenCap, rate, icoStartTime,
  initialMidFreeFundBalance, goal, whiteList,
} from './helpers/midfree_helper';

contract('MidFreeCoin', ([wallet]) => {
  let token;
  const expectedTokenSupply = ether(99990000);

  beforeEach(async function () {
    this.startBlock = web3.eth.blockNumber + 10;
    this.endBlock = web3.eth.blockNumber + 20;

    this.crowdsale = await MidFreeCoinCrowdsale.new(this.startBlock, icoStartTime, this.endBlock,
      rate.base, wallet, ether(cap), ether(tokenCap), initialMidFreeFundBalance, ether(goal), whiteList);

    token = MidFreeCoin.at(await this.crowdsale.token());
  });

  it('owner should be able to burn tokens', async () => {
    const { logs } = await token.burn(ether(10000), { from: wallet });

    const balance = await token.balanceOf(wallet);
    balance.should.be.bignumber.equal(expectedTokenSupply);

    const totalSupply = await token.totalSupply();
    totalSupply.should.be.bignumber.equal(expectedTokenSupply);

    const event = logs.find(e => e.event === 'Burn');
    should.exist(event);
  });

  it('cannot burn more tokens than your balance', async () => {
    await token.burn(ether(100000001), { from: wallet })
      .should.be.rejectedWith(EVMThrow);
  });
});
