import ether from '../utilities/ether';
import advanceToBlock from './helpers/advanceToBlock';
import EVMThrow from './helpers/EVMThrow';

import {
  MidFreeCoinCrowdsale, icoStartTime, cap, tokenCap, rate, initialMidFreeFundBalance,
  goal, BigNumber, setTimingToBaseTokenRate, whiteList, TestConstant,
} from './helpers/midfree_helper';

contract('MidFreeCoinCrowdsale', ([owner, wallet, investor, notInvestor]) => {
  const lessThanGoal = ether(goal).minus(ether(100));

  before(async () => {
    await setTimingToBaseTokenRate();
  });

  beforeEach(async function () {
    this.startBlock = web3.eth.blockNumber + 10;
    this.endBlock = web3.eth.blockNumber + 20;

    this.crowdsale = await MidFreeCoinCrowdsale.new(this.startBlock, icoStartTime, this.endBlock,
      rate.base, wallet, ether(cap), ether(tokenCap), initialMidFreeFundBalance
      , ether(goal), whiteList, { from: owner });
  });
  // クラウドセールの返金手続きの仕組みのテスト
  describe('creating a valid refundable crowdsale', () => {
    // 目標値が0だとエラー
    it('should fail with zero goal', async function () {
      await MidFreeCoinCrowdsale.new(this.startBlock, icoStartTime, this.endBlock,
        rate.base, wallet, ether(cap), ether(tokenCap), initialMidFreeFundBalance, 0,
        whiteList, { from: owner })
        .should.be.rejectedWith(EVMThrow);
    });
    //  7500ETH獲得時はゴール達成の判定となっている
    it('should goal be 7500 ETH', async function () {
      const expect = ether(TestConstant.minETH);
      const actual = await this.crowdsale.goal();
      await actual.should.be.bignumber.equal(expect);
    });
    // ゴール達成時に3億円獲得計算となっている
    it('should goal be 300,000,000 JPY', async () => {
      const goalAsJPY = new BigNumber(300000000); // 約3億円
      const expectedEtherPrice = new BigNumber(40000); // 4万円
      const convertedGoal = expectedEtherPrice.times(goal);
      await goalAsJPY.should.be.bignumber.equal(convertedGoal);
    });
    // 目標達成しても終了にはなっていない
    it('should has enough MidFreeCoin to reach the goal', async function () {
      let hasEnded = await this.crowdsale.hasEnded();
      hasEnded.should.equal(false);
      await advanceToBlock(this.startBlock - 1);
      await this.crowdsale.sendTransaction({ value: ether(goal), from: investor });
      hasEnded = await this.crowdsale.hasEnded();
      hasEnded.should.equal(false);
    });

    // Etherでなくweiで判定できている
    it('should goal unit be wei(not ether)', async () => {
      const target = await MidFreeCoinCrowdsale.deployed();
      const actual = await target.goal();
      actual.should.be.bignumber.equal(ether(goal));
    });
  });

  // 返金を拒否するケース
  describe('deny refunds', () => {
    // 終了前は返金しない
    it('should deny refunds before end', async function () {
      await this.crowdsale.claimRefund({ from: investor })
        .should.be.rejectedWith(EVMThrow);
      await advanceToBlock(this.endBlock - 1);
      await this.crowdsale.claimRefund({ from: investor })
        .should.be.rejectedWith(EVMThrow);
    });
    // 終了後であっても目標達成時には返金しない
    it('should deny refunds after end if goal was reached', async function () {
      await advanceToBlock(this.startBlock - 1);
      await this.crowdsale.sendTransaction({ value: ether(goal), from: investor });
      await advanceToBlock(this.endBlock);
      await this.crowdsale.finalize({ from: owner });
      await this.crowdsale.claimRefund({ from: investor })
        .should.be.rejectedWith(EVMThrow);
    });
    // 終了後であっても目標をオーバーしていれば返金しない
    it('should deny refunds after end if goal was exceeded', async function () {
      await advanceToBlock(this.startBlock - 1);
      const exceeded = ether(goal).plus(ether(100));
      await this.crowdsale.sendTransaction({ value: exceeded, from: investor });
      await advanceToBlock(this.endBlock);
      await this.crowdsale.finalize({ from: owner });
      await this.crowdsale.claimRefund({ from: investor })
        .should.be.rejectedWith(EVMThrow);
    });
    // 上限まで達している場合も返金しない
    it('should deny refunds if cap was reached', async function () {
      await advanceToBlock(this.startBlock - 1);

      // offered amount / base rate = cap reaching amount
      // 50000000 / 1200 = 41666
      const capReachingAmount = await ether(TestConstant.maxETH);
      await this.crowdsale.sendTransaction({ value: capReachingAmount, from: investor });
      await advanceToBlock(this.endBlock);
      await this.crowdsale.finalize({ from: owner });

      await this.crowdsale.claimRefund({ from: investor })
        .should.be.rejectedWith(EVMThrow);
    });
    // 目標達成時はgoalReachedがtrueになっている
    it('should goalReached() be true', async function () {
      await advanceToBlock(this.startBlock - 1);
      const exceeded = ether(goal).plus(ether(100));
      await this.crowdsale.sendTransaction({ value: exceeded, from: investor });
      await advanceToBlock(this.endBlock);
      await this.crowdsale.finalize({ from: owner });

      const actual = await this.crowdsale.goalReached();

      await actual.should.equal(true);
    });
  });
  // 返金を許可するケース
  describe('allow refunds', () => {
    // 終了後に目標額に達していない場合
    it('should allow refunds after end if goal was not reached', async function () {
      const beforeSend = web3.eth.getBalance(investor);

      await advanceToBlock(this.startBlock - 1);
      await this.crowdsale.sendTransaction(
        { value: lessThanGoal, from: investor, gasPrice: 0 });
      await advanceToBlock(this.endBlock);
      await this.crowdsale.finalize({ from: owner });

      const sent = web3.eth.getBalance(investor);
      await this.crowdsale.claimRefund({ from: investor, gasPrice: 0 })
        .should.be.fulfilled;
      const afterClaim = web3.eth.getBalance(investor);

      await beforeSend.should.be.bignumber.equal(afterClaim);
      await afterClaim.minus(sent).should.be.bignumber.equal(lessThanGoal);
    });
    // 終了後に目標額に1Ether足りない場合
    it('should allow refunds after end if goal was only 1 ether missing', async function () {
      await advanceToBlock(this.startBlock - 1);
      const onlyOneEtherMissing = ether(goal).minus(ether(1));
      await this.crowdsale.sendTransaction({ value: onlyOneEtherMissing, from: investor });
      await advanceToBlock(this.endBlock);
      await this.crowdsale.finalize({ from: owner });

      const pre = web3.eth.getBalance(investor);
      await this.crowdsale.claimRefund({ from: investor, gasPrice: 0 })
        .should.be.fulfilled;
      const post = web3.eth.getBalance(investor);

      post.minus(pre).should.be.bignumber.equal(onlyOneEtherMissing);
    });
    // 投資者でなければ0Etherを返す
    it('should return 0 ether to non investors', async function () {
      await advanceToBlock(this.startBlock - 1);
      await this.crowdsale.sendTransaction({ value: lessThanGoal, from: investor });
      await advanceToBlock(this.endBlock);
      await this.crowdsale.finalize({ from: owner });

      const pre = web3.eth.getBalance(notInvestor);
      await this.crowdsale.claimRefund({ from: notInvestor, gasPrice: 0 })
        .should.be.fulfilled;
      const post = web3.eth.getBalance(notInvestor);

      post.should.be.bignumber.equal(pre);
    });
    // goalReachedはfalseになっている
    it('should goalReached() be false', async function () {
      await advanceToBlock(this.startBlock - 1);
      await this.crowdsale.sendTransaction({ value: lessThanGoal, from: investor });
      await advanceToBlock(this.endBlock);
      await this.crowdsale.finalize({ from: owner });

      const actual = await this.crowdsale.goalReached();

      actual.should.equal(false);
    });
  });

  // 目標達成の場合
  describe('goal was reached', () => {
    // 終了後にFundに送金される
    it('should forward funds to wallet after end', async function () {
      await advanceToBlock(this.startBlock - 1);
      await this.crowdsale.sendTransaction({ value: ether(goal), from: investor });
      await advanceToBlock(this.endBlock);

      const pre = web3.eth.getBalance(wallet);
      await this.crowdsale.finalize({ from: owner });
      const post = web3.eth.getBalance(wallet);

      post.minus(pre).should.be.bignumber.equal(ether(goal));
    });
  });
});
