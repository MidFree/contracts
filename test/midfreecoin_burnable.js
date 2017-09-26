import ether from '../utilities/ether';
import { advanceBlock } from './helpers/advanceToBlock';
import { duration } from './helpers/increaseTime';
import latestTime from './helpers/latestTime';
import EVMThrow from './helpers/EVMThrow';

import { MidFreeCoin, MidFreeCoinCrowdsale, should, cap, tokenCap, rate,
  initialMidFreeFundBalance, goal, TestConstant,
} from './helpers/midfree_helper';

contract('MidFreeCoin', ([wallet]) => {
  let token;
  const expectedTokenSupply = ether(49958334);

  before(async () => {
    await advanceBlock();
  });

  beforeEach(async function () {
    this.beforeStartTime = latestTime() + duration.weeks(1);
    this.startTime = this.beforeStartTime + duration.weeks(1);
    this.endTime = this.startTime + duration.weeks(4);
    this.afterEndTime = this.endTime + duration.seconds(1);

    this.crowdsale = await MidFreeCoinCrowdsale.new(this.startTime, this.endTime,
      rate.base, wallet, ether(cap), ether(tokenCap), initialMidFreeFundBalance, ether(goal));

    token = MidFreeCoin.at(await this.crowdsale.token());
  });

  it('owner should be able to burn tokens', async () => {
    const { logs } = await token.burn(ether(TestConstant.maxETH), { from: wallet });

    const balance = await token.balanceOf(wallet);
    balance.should.be.bignumber.equal(expectedTokenSupply);

    const totalSupply = await token.totalSupply();
    totalSupply.should.be.bignumber.equal(expectedTokenSupply);

    const event = logs.find(e => e.event === 'Burn');
    should.exist(event);
  });

  it('cannot burn more tokens than your balance', async () => {
    await token.burn(ether(TestConstant.initialFundTokenAmount + 1), { from: wallet })
      .should.be.rejectedWith(EVMThrow);
  });
});
