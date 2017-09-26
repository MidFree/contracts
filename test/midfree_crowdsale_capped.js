import ether from '../utilities/ether';
import { advanceBlock } from './helpers/advanceToBlock';
import { increaseTimeTo, duration } from './helpers/increaseTime';
import latestTime from './helpers/latestTime';
import EVMThrow from './helpers/EVMThrow';

import { MidFreeCoin, MidFreeCoinCrowdsale, cap, tokenCap, rate, BigNumber,
  initialMidFreeFundBalance, goal, whiteList, TestConstant,
} from './helpers/midfree_helper';

contract('MidFreeCoinCrowdsale', ([investor, wallet]) => {
  const lessThanCap = ether(cap).div(5);

  // OfferedValue / base rate = token cap of ether
  // 50,000,000 / 1,200 = 41,666
  // 上限のEther量
  const tokenCapOfEther = ether(TestConstant.maxETH);

  // Token cap of ether - ( Token cap / 100 ) / rate = Threshold of ether
  // 125000 - ((500000000 / 100) / 2000) = 122,500
  // 41666 - ((100000000/100)/1200) =40832
  const thresholdOfEther = ether(40834);

  before(async () => {
    await advanceBlock();
  });

  beforeEach(async function () {
    this.beforeStartTime = latestTime() + duration.weeks(1);
    this.startTime = this.beforeStartTime + duration.weeks(1);
    this.endTime = this.startTime + duration.weeks(4);
    this.afterEndTime = this.endTime + duration.seconds(1);

    this.crowdsale = await MidFreeCoinCrowdsale.new(this.startTime, this.endTime,
      rate.base, wallet, ether(cap), ether(tokenCap), initialMidFreeFundBalance, ether(goal), whiteList);

    this.token = MidFreeCoin.at(await this.crowdsale.token());
  });

  // 正しくクラウドセールのキャップが設定できていることの確認
  describe('creating a valid capped crowdsale', () => {
    // 0でキャップするとエラーになること
    it('should fail with zero cap', async function () {
      await MidFreeCoinCrowdsale.new(this.startTime, this.endTime,
        rate.base, wallet, 0, initialMidFreeFundBalance, ether(goal), whiteList)
        .should.be.rejectedWith(EVMThrow);
    });
    // 35000Ether以上は集めないので上限の確認
    it('should cap of ETH be 41,667', async function () {
      const expect = ether(TestConstant.maxETH);
      const crowdSaleTokenCap = await this.crowdsale.cap();
      await crowdSaleTokenCap.toNumber().should.be.bignumber.equal(expect);
    });
    // 全配布MFCトークン量
    it('should cap of MFC token be 100 million', async function () {
      const expect = ether(TestConstant.allTokenAmount);
      const crowdSaleTokenCap = await this.crowdsale.tokenCap();
      await crowdSaleTokenCap.toNumber().should.be.bignumber.equal(expect);
    });
  });

  // 上限での送金の受け取り
  describe('accepting payments with cap', () => {
    beforeEach(async function () {
      // base rateでチェックするために最終週で設定する
      await increaseTimeTo(this.startTime + duration.weeks(3));
    });
    // 上限内なら送金可能
    it('should accept payments within cap', async function () {
      await this.crowdsale.send(ether(cap).minus(lessThanCap)).should.be.fulfilled;
    });
    // 上限ちょうどであっても送金可能
    it('should accept payments just cap', async function () {
      await this.crowdsale.send(ether(cap).minus(lessThanCap)).should.be.fulfilled;
      await this.crowdsale.send(lessThanCap).should.be.fulfilled;
    });
    // 上限に達している場合に送金不可
    it('should reject payments outside cap', async function () {
      await this.crowdsale.send(ether(cap));
      await this.crowdsale.send(1).should.be.rejectedWith(EVMThrow);
    });
    // 上限を超えて送金しても失敗してETHを失うわけではない
    it('should not lose ETH if payments outside cap', async function () {
      await this.crowdsale.send(ether(cap));

      const beforeSend = web3.eth.getBalance(investor);
      await this.crowdsale.sendTransaction(
        { value: 1, from: investor, gasPrice: 0 })
        .should.be.rejectedWith(EVMThrow);

      const afterRejected = web3.eth.getBalance(investor);
      await afterRejected.should.be.bignumber.equal(beforeSend);
    });
    // 上限を超える送金は拒否される
    it('should reject payments that exceed cap', async function () {
      await this.crowdsale.send(ether(cap).plus(1)).should.be.rejectedWith(EVMThrow);
    });
    // 上限を超えた送金をしても失敗してETHを失わない
    it('should not lose ETH if payments that exceed cap', async function () {
      const beforeSend = web3.eth.getBalance(investor);
      await this.crowdsale.sendTransaction(
        { value: ether(cap).plus(1), from: investor, gasPrice: 0 })
        .should.be.rejectedWith(EVMThrow);

      const afterRejected = web3.eth.getBalance(investor);
      await afterRejected.should.be.bignumber.equal(beforeSend);
    });

    // 上限まで集まったとしてMFCのトークン量は上限を超えていない
    it('should not over 100,000,000 MFC token if just cap', async function () {
      await this.crowdsale.send(ether(cap).minus(lessThanCap)).should.be.fulfilled;
      await this.crowdsale.send(lessThanCap).should.be.fulfilled;

      const totalSupply = await new BigNumber(await this.token.totalSupply());
      const actual = await totalSupply.lessThanOrEqualTo(ether(TestConstant.allTokenAmount));

      await actual.should.equal(true);
    });
  });
  // 上限値での送金の受け取り
  describe('accepting payments with token cap', () => {
    beforeEach(async function () {
      await increaseTimeTo(this.startTime + duration.weeks(3));
    });
    // トークン数的な上限より少ない送金を受け取る
    it('should accept payments within token cap', async function () {
      await this.crowdsale.send(tokenCapOfEther.minus(lessThanCap)).should.be.fulfilled;
    });
    // トークン数的に上限ちょうどで送金を受け取る
    it('should accept payments just token cap', async function () {
      await this.crowdsale.send(tokenCapOfEther.minus(lessThanCap)).should.be.fulfilled;
      await this.crowdsale.send(lessThanCap).should.be.fulfilled;
    });
    // トークン数的に上限を少し超えた送金は受け取らない
    it('should reject payments outside token cap', async function () {
      await this.crowdsale.send(tokenCapOfEther);
      await this.crowdsale.send(1).should.be.rejectedWith(EVMThrow);
    });
    // 上限を超えての送金は失敗してもETHを失わない
    it('should not lose ETH if payments outside token cap', async function () {
      await this.crowdsale.send(tokenCapOfEther);

      const beforeSend = web3.eth.getBalance(investor);
      await this.crowdsale.sendTransaction(
        { value: 1, from: investor, gasPrice: 0 })
        .should.be.rejectedWith(EVMThrow);

      const afterRejected = web3.eth.getBalance(investor);
      await afterRejected.should.be.bignumber.equal(beforeSend);
    });
    // 上限より多い送金は受け取らない
    it('should reject payments that exceed token cap', async function () {
      await this.crowdsale.send(tokenCapOfEther.plus(1)).should.be.rejectedWith(EVMThrow);
    });
    // 上限を超えたETHを送ってもETHを失わない
    it('should not lose ETH if payments that exceed token cap', async function () {
      const beforeSend = web3.eth.getBalance(investor);
      await this.crowdsale.sendTransaction(
        { value: tokenCapOfEther.plus(1), from: investor, gasPrice: 0 })
        .should.be.rejectedWith(EVMThrow);

      const afterRejected = web3.eth.getBalance(investor);
      await afterRejected.should.be.bignumber.equal(beforeSend);
    });
    // 上限ちょうどの送金の場合、800MFC余る
    it('should equal 100,000,000 MFC token if just token cap', async function () {
      await this.crowdsale.send(tokenCapOfEther.minus(lessThanCap)).should.be.fulfilled;
      await this.crowdsale.send(lessThanCap).should.be.fulfilled;

      const totalSupply = await new BigNumber(await this.token.totalSupply());
      await totalSupply.should.be.bignumber.equal(ether(TestConstant.allTokenAmount).minus(ether(800)));
    });
  });
  // 上限に達して終了するテスト
  describe('ending with cap', () => {
    beforeEach(async function () {
      await increaseTimeTo(this.startTime + duration.weeks(3));
    });
    // 上限到達していないと終了しない
    it('should not be ended if under cap', async function () {
      let hasEnded = await this.crowdsale.hasEnded();
      hasEnded.should.equal(false);
      await this.crowdsale.send(lessThanCap);
      hasEnded = await this.crowdsale.hasEnded();
      hasEnded.should.equal(false);
    });
    // 上限に到達していると終了する
    it('should be ended if cap reached', async function () {
      await this.crowdsale.send(ether(cap));
      const hasEnded = await this.crowdsale.hasEnded();
      hasEnded.should.equal(true);
    });
  });
  // トークン数の上限で終了する
  describe('ending with token cap', () => {
    beforeEach(async function () {
      await increaseTimeTo(this.startTime + duration.weeks(3));
    });
    // トークン上限のしきい値以下ではまだ終わらない
    it('should not be ended if under token cap threshold', async function () {
      let hasEnded = await this.crowdsale.hasEnded();
      hasEnded.should.equal(false);
      await this.crowdsale.send(thresholdOfEther.minus(ether(TestConstant.minETH)));
      hasEnded = await this.crowdsale.hasEnded();
      hasEnded.should.equal(false);
    });
    // トークン上限しきい値の前では直ちに終わらない
    it('should not be ended even if immediately before token cap threshold', async function () {
      await this.crowdsale.send(thresholdOfEther.minus(ether(1)));

      const hasEnded = await this.crowdsale.hasEnded();
      hasEnded.should.equal(false);
    });
    // 上限到達時に終了する
    it('should be ended if cap reached', async function () {
      await this.crowdsale.send(tokenCapOfEther);
      const hasEnded = await this.crowdsale.hasEnded();
      hasEnded.should.equal(true);
    });
  });
});
