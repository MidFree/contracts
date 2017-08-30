import ether from '../utilities/ether';

import {
  MidFreeCoin, MidFreeCoinCrowdsale, icoStartTime, cap, tokenCap, rate,
  initialMidFreeFundBalance, goal, setTimingToBaseTokenRate, whiteList
} from './helpers/midfree_helper';

contract('MidFreeCoinCrowdsale', ([wallet]) => {
  before(async () => {
    await setTimingToBaseTokenRate();
  });

  beforeEach(async function () {
    this.startBlock = web3.eth.blockNumber + 10;
    this.endBlock = web3.eth.blockNumber + 20;

    this.crowdsale = await MidFreeCoinCrowdsale.new(this.startBlock, icoStartTime, this.endBlock,
      rate.base, wallet, ether(cap), ether(tokenCap), initialMidFreeFundBalance, ether(goal), whiteList,
    );

    this.token = MidFreeCoin.at(await this.crowdsale.token());
  });

  describe('initialized correctly', () => {
    it('should has correct white listed addresses', async function () {
      for (let i = 0; i < whiteList.length; i++) {
        const actual = await this.crowdsale.whiteList(whiteList[i]);
        actual.should.be.equal(true);
      }
    });
  });

  describe('member confirmation', () => {
    it('should white listed address be return true', async function () {
      for (let i = 0; i < whiteList.length; i++) {
        const actual = await this.crowdsale.isWhiteListMember(whiteList[i]);
        actual.should.be.equal(true);
      }
    });

    it('should not un white listed address be return false', async function () {
      const unWhiteListedAddress = '0x9f874e3dd3b765430682a6264990000000000000';
      const actual = await this.crowdsale.isWhiteListMember(unWhiteListedAddress);
      actual.should.be.equal(false);
    });
  });
});
