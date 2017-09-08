import moment from 'moment';
import ether from '../utilities/ether';
import advanceToBlock from './helpers/advanceToBlock';
import increaseTime from './helpers/increaseTime';
import EVMThrow from './helpers/EVMThrow';

import {
  MidFreeCoinCrowdsale, icoStartTime, cap, tokenCap, rate, initialMidFreeFundBalance, goal,
  setTimingToTokenSaleStart, TestConstant,
} from './helpers/midfree_helper';

contract('MidFreeCoinCrowdsale', ([investor, owner, wallet, whiteListedMember, notWhiteListedMember]) => {
  const whiteList = [whiteListedMember];

  beforeEach(async function () {
    this.startBlock = web3.eth.blockNumber + 10;
    this.endBlock = web3.eth.blockNumber + 20;

    this.crowdsale = await MidFreeCoinCrowdsale.new(this.startBlock, icoStartTime, this.endBlock,
      rate.base, wallet, ether(cap), ether(tokenCap), initialMidFreeFundBalance, ether(goal), whiteList,
      { from: owner });
  });

  describe('creating a valid rate customizable crowdsale', () => {
    it('should initial rate be 50,000 MidFreeCoin for pre sale', async function () {
      const expect = TestConstant.preSaleRate; // pre sale
      await advanceToBlock(this.endBlock - 1);
      const actual = await this.crowdsale.getRate();
      await actual.should.be.bignumber.equal(expect);
    });
  });
  // プレセールのテスト期間中の確認
  describe('Pre sale', () => {
    const someOfEtherAmount = ether(10);
    // テストのプレセール期間はホワイトリストからの購入でないとリジェクト
    it('should reject payments if not white listed member', async function () {
      await advanceToBlock(this.startBlock - 1);
      await this.crowdsale.buyTokens(investor, { value: someOfEtherAmount, from: notWhiteListedMember })
        .should.be.rejectedWith(EVMThrow);
    });
    // プレセールでリジェクトされてもETHは失わない
    it('should not lose ETH if payments were rejected in pre sale', async function () {
      await advanceToBlock(this.startBlock - 1);

      const beforeSend = web3.eth.getBalance(investor);
      await this.crowdsale.sendTransaction(
        { value: someOfEtherAmount, from: investor, gasPrice: 0 })
        .should.be.rejectedWith(EVMThrow);

      const afterRejected = web3.eth.getBalance(investor);
      await afterRejected.should.be.bignumber.equal(beforeSend);
    });
    // ホワイトリストメンバーならトークン購入できる
    it('should accept payments if white listed member', async function () {
      await advanceToBlock(this.startBlock - 1);
      await this.crowdsale.buyTokens(investor, { value: someOfEtherAmount, from: whiteListedMember })
        .should.be.fulfilled;
    });
    // 上限より1トークン少ないテスト
    it('should accept payments 499,999 MidFree tokens', async function () {
      await advanceToBlock(this.startBlock - 1);
      // ether * rate of pre sale = MidFree tokens.
      // 9.99998 * 50,000 = 499,999
      const etherAmount = await ether(9.99998);
      await this.crowdsale.buyTokens(investor, { value: etherAmount, from: whiteListedMember })
        .should.be.fulfilled;
    });
    // 上限ちょうどのテスト
    it('should accept payments 500,000 MidFree tokens', async function () {
      await advanceToBlock(this.startBlock - 1);
      // ether * rate of pre sale = MidFree tokens.
      // 10 * 50,000 = 500,000
      const etherAmount = await ether(10);
      await this.crowdsale.buyTokens(investor, { value: etherAmount, from: whiteListedMember })
        .should.be.fulfilled;
    });
    // 上限を1トークン超えた場合のテスト
    it('should reject payments 500,001 MidFree tokens', async function () {
      await advanceToBlock(this.startBlock - 1);
      // ether * rate of pre sale = MidFree tokens.
      // 10.00002 * 50,000 = 500,001
      const etherAmount = await ether(10.00002);
      await this.crowdsale.buyTokens(investor, { value: etherAmount, from: whiteListedMember })
        .should.be.rejectedWith(EVMThrow);
    });

    it('should not lose ETH if payments 500,001 MidFree tokens', async function () {
      await advanceToBlock(this.startBlock - 1);
      const beforeSend = web3.eth.getBalance(whiteListedMember);

      // ether * rate of pre sale = MidFree tokens.
      // 10.00002 * 50,000 = 500,001
      const etherAmount = await ether(10.00002);
      await this.crowdsale.buyTokens(investor, { value: etherAmount, from: whiteListedMember, gasPrice: 0 })
        .should.be.rejectedWith(EVMThrow);

      const afterRejected = web3.eth.getBalance(whiteListedMember);
      await afterRejected.should.be.bignumber.equal(beforeSend);
    });
  });

  describe('Week1', () => {
    // 50,000,000 / 1500 = 33333
    const nearTokenCapOfEther = ether(33333);
    // const nearTokenCapOfEther = ether(TestConstant.maxETH);

    it('should rate of week1 be 1,500 MidFree when just started', async function () {
      await setTimingToTokenSaleStart();

      const expect = TestConstant.week1Rate;
      await advanceToBlock(this.endBlock - 1);
      const actual = await this.crowdsale.getRate();
      await actual.should.be.bignumber.equal(expect);
    });

    it('should rate of week1 be 1,500 MidFree when 1 minuit after started', async function () {
      const duration = 60;
      await increaseTime(moment.duration(duration, 'second'));

      const expect = TestConstant.week1Rate;
      await advanceToBlock(this.endBlock - 1);
      const actual = await this.crowdsale.getRate();
      await actual.should.be.bignumber.equal(expect);
    });

    it('should accept payments over 500,001 MidFree tokens', async function () {
      await advanceToBlock(this.startBlock - 1);
      // ether / rate = MidFree tokens.
      // 500,000 / 1,500 = 333
      const etherAmount = await ether(333);
      await this.crowdsale.buyTokens(investor, { value: etherAmount })
        .should.be.fulfilled;
    });

    it('should accept payments until 50,000,000 MidFree tokens', async function () {
      await advanceToBlock(this.startBlock - 1);
      await this.crowdsale.buyTokens(investor, { value: nearTokenCapOfEther })
        .should.be.fulfilled;
    });

    it('should reject payments over 50,000,000 MidFree tokens', async function () {
      await advanceToBlock(this.startBlock - 1);
      await this.crowdsale.buyTokens(investor, { value: nearTokenCapOfEther.add(ether(1)) })
        .should.be.rejectedWith(EVMThrow);
    });

    it('should rate of week1 be 1,500 MidFreeCoin when 1 minute before ended', async function () {
      const duration = (60 * 60 * 24 * 7) - 120; // 1 week - 2 minute.
      await increaseTime(moment.duration(duration, 'second'));

      const expect = TestConstant.week1Rate;
      await advanceToBlock(this.endBlock - 1);
      const actual = await this.crowdsale.getRate();
      await actual.should.be.bignumber.equal(expect);
    });
  });

  describe('Week2', () => {
    // 50,000,000 / 1,400 = 35,714
    const nearTokenCapOfEther = ether(35714);
    // const nearTokenCapOfEther = ether(TestConstant.maxETH);

    it('should rate of week2 be 1,400 MidFreeCoin when just started', async function () {
      const duration = 60;
      await increaseTime(moment.duration(duration, 'second'));

      const expect = TestConstant.week2Rate;
      await advanceToBlock(this.endBlock - 1);
      const actual = await this.crowdsale.getRate();
      await actual.should.be.bignumber.equal(expect);
    });

    it('should rate of week2 be 1,400 MidFreeCoin when 1 minuit after started', async function () {
      const duration = 60;
      await increaseTime(moment.duration(duration, 'second'));

      const expect = TestConstant.week2Rate;
      await advanceToBlock(this.endBlock - 1);
      const actual = await this.crowdsale.getRate();
      await actual.should.be.bignumber.equal(expect);
    });

    it('should accept payments over 500,001 MidFree tokens', async function () {
      await advanceToBlock(this.startBlock - 1);
      // ether / rate = MidFree tokens.
      // 500,000 / 1,400 = 357
      const etherAmount = await ether(357);
      await this.crowdsale.buyTokens(investor, { value: etherAmount })
        .should.be.fulfilled;
    });

    it('should accept payments until 50,000,000 MidFree tokens', async function () {
      await advanceToBlock(this.startBlock - 1);
      await this.crowdsale.buyTokens(investor, { value: nearTokenCapOfEther })
        .should.be.fulfilled;
    });

    it('should reject payments over 50,000,000 MidFree tokens', async function () {
      await advanceToBlock(this.startBlock - 1);
      await this.crowdsale.buyTokens(investor, { value: nearTokenCapOfEther.add(ether(1)) })
        .should.be.rejectedWith(EVMThrow);
    });

    it('should rate of week2 be 1,400 MidFreeCoin when few minuit before ended', async function () {
      // FIXME: This duration (600 sec) because of time management specification.
      const duration = (60 * 60 * 24 * 7) - 600; // 1 week - 10 minute.
      await increaseTime(moment.duration(duration, 'second'));

      const expect = TestConstant.week2Rate;
      await advanceToBlock(this.endBlock - 1);
      const actual = await this.crowdsale.getRate();
      await actual.should.be.bignumber.equal(expect);
    });
  });

  describe('Week3', () => {
    // 50,000,000 / 1,300 = 38461.5384615
    const nearTokenCapOfEther = ether(38461.5);
    // const nearTokenCapOfEther = ether(TestConstant.maxETH);

    it('should rate of week3 be 1,300 MidFreeCoin when just started', async function () {
      const duration = 600;
      await increaseTime(moment.duration(duration, 'second'));

      const expect = TestConstant.week3Rate;
      await advanceToBlock(this.endBlock - 1);
      const actual = await this.crowdsale.getRate();
      await actual.should.be.bignumber.equal(expect);
    });

    it('should rate of week3 be 1,300 MidFreeCoin when 1 minuit after started', async function () {
      const duration = 60;
      await increaseTime(moment.duration(duration, 'second'));

      const expect = TestConstant.week3Rate;
      await advanceToBlock(this.endBlock - 1);
      const actual = await this.crowdsale.getRate();
      await actual.should.be.bignumber.equal(expect);
    });

    it('should accept payments over 500,001 MidFree tokens', async function () {
      await advanceToBlock(this.startBlock - 1);
      // ether / rate = MidFree tokens.
      // 500,000 / 1,300 = 384.6
      const etherAmount = await ether(385);
      await this.crowdsale.buyTokens(investor, { value: etherAmount })
        .should.be.fulfilled;
    });

    it('should accept payments until 50,000,000 MidFree tokens', async function () {
      await advanceToBlock(this.startBlock - 1);
      await this.crowdsale.buyTokens(investor, { value: nearTokenCapOfEther })
        .should.be.fulfilled;
    });

    it('should reject payments over 50,000,000 MidFree tokens', async function () {
      await advanceToBlock(this.startBlock - 1);
      await this.crowdsale.buyTokens(investor, { value: nearTokenCapOfEther.add(ether(1)) })
        .should.be.rejectedWith(EVMThrow);
    });

    it('should rate of week3 be 1,300 MidFreeCoin when few minute before ended', async function () {
      // FIXME: This duration (600 sec) because of time management specification.
      const duration = (60 * 60 * 24 * 7) - 600; // 1 week - 10 minute.
      await increaseTime(moment.duration(duration, 'second'));

      const expect = TestConstant.week3Rate;
      await advanceToBlock(this.endBlock - 1);
      const actual = await this.crowdsale.getRate();
      await actual.should.be.bignumber.equal(expect);
    });
  });

  describe('From week4 to until the end of token sale', () => {
    // 50,000,000 / 1,200 = 41666
    const maxEtherAmount = ether(41666);

    it('should rate of week4 be 1,200 MidFreeCoin when just started', async function () {
      const duration = 1200;
      await increaseTime(moment.duration(duration, 'second'));

      const expect = TestConstant.week4Rate;
      await advanceToBlock(this.endBlock - 1);
      const actual = await this.crowdsale.getRate();
      await actual.should.be.bignumber.equal(expect);
    });

    it('should rate of week4 be 1,200 MidFreeCoin when few minute after started', async function () {
      const duration = 60;
      await increaseTime(moment.duration(duration, 'second'));

      const expect = TestConstant.week4Rate;
      await advanceToBlock(this.endBlock - 1);
      const actual = await this.crowdsale.getRate();
      await actual.should.be.bignumber.equal(expect);
    });

    it('should accept payments over 500,001 MidFree tokens', async function () {
      await advanceToBlock(this.startBlock - 1);
      // ether / rate = MidFree tokens.
      // 500,000 / 1,200 = 416.6
      const etherAmount = await ether(416.7);
      await this.crowdsale.buyTokens(investor, { value: etherAmount })
        .should.be.fulfilled;
    });

    it('should accept payments until 50,000,000 MidFree tokens', async function () {
      await advanceToBlock(this.startBlock - 1);
      await this.crowdsale.buyTokens(investor, { value: maxEtherAmount })
        .should.be.fulfilled;
    });

    it('should reject payments over 50,000,000 MidFree tokens', async function () {
      await advanceToBlock(this.startBlock - 1);
      await this.crowdsale.buyTokens(investor, { value: maxEtherAmount.add(ether(1)) })
        .should.be.rejectedWith(EVMThrow);
    });

    it('should rate of week4 be 1,200 MidFreeCoin when few minute before ended', async function () {
      // FIXME: This duration (1,200 sec) because of time management specification.
      const duration = (60 * 60 * 24 * 7) - 1800; // 1 week - 30 minute.
      await increaseTime(moment.duration(duration, 'second'));

      const expect = TestConstant.week4Rate;
      await advanceToBlock(this.endBlock - 1);
      const actual = await this.crowdsale.getRate();
      await actual.should.be.bignumber.equal(expect);
    });
  });
});
