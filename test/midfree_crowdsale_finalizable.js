import ether from '../utilities/ether';
import { advanceBlock } from './helpers/advanceToBlock';
import { increaseTimeTo, duration } from './helpers/increaseTime';
import latestTime from './helpers/latestTime';
import EVMThrow from './helpers/EVMThrow';

import { MidFreeCoin, MidFreeCoinCrowdsale, cap, tokenCap, rate,
  initialMidFreeFundBalance, goal, should, TestConstant,
} from './helpers/midfree_helper';

contract('MidFreeCoinCrowdsale', ([owner, wallet, thirdparty]) => {
  // Token cap of ether - ( Token cap / 100 ) / rate = Threshold of ether
  // 125000 - ((500000000 / 100) / 2000) = 122,500
  // 41666 - ((100000000/100)/1200) =40833.6666667
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
      rate.base, wallet, ether(cap), ether(tokenCap),
      initialMidFreeFundBalance, ether(goal), { from: owner });

    this.token = MidFreeCoin.at(await this.crowdsale.token());
  });
  // 終了時のテスト
  describe('finalize', () => {
    // 終了後にオーナーが確定されることの確認
    it('can be finalized by owner after ending', async function () {
      await increaseTimeTo(this.afterEndTime);
      await this.crowdsale.finalize({ from: owner }).should.be.fulfilled;
    });
    // 上限値の99%に到達した時に確定になる確認
    it('can be finalized when token cap reached 99%', async function () {
      await increaseTimeTo(this.startTime + duration.weeks(3));
      await this.crowdsale.send(thresholdOfEther);
      await this.crowdsale.finalize({ from: owner }).should.be.fulfilled;
    });
    // 上限値の99%を超えた時に確定になる確認
    it('can be finalized when token cap over 99%', async function () {
      await increaseTimeTo(this.startTime + duration.weeks(3));
      await this.crowdsale.send(thresholdOfEther.plus(1));
      await this.crowdsale.finalize({ from: owner }).should.be.fulfilled;
    });
    // トークンの上限ちょうどでも確定になる確認
    it('can be finalized when just token cap reached', async function () {
      const tokenCapOfEther = ether(TestConstant.maxETH);

      await increaseTimeTo(this.startTime + duration.weeks(3));
      await this.crowdsale.send(tokenCapOfEther);
      await this.crowdsale.finalize({ from: owner }).should.be.fulfilled;
    });
    // 確定したログが出ていることの確認
    it('logs finalized', async function () {
      await increaseTimeTo(this.afterEndTime);
      const { logs } = await this.crowdsale.finalize({ from: owner });
      const event = logs.find(e => e.event === 'Finalized');
      should.exist(event);
    });
    // 終了時にマイニングは終了していない確認？？
    it('do not finishes minting of token', async function () {
      await increaseTimeTo(this.afterEndTime);
      await this.crowdsale.finalize({ from: owner });
      const finished = await this.token.mintingFinished();
      finished.should.equal(false);
    });
    // Fundアカウントに転送される確認
    it('should change owner of MidFreeCoin to MidFreeFund', async function () {
      await increaseTimeTo(this.afterEndTime);
      await this.crowdsale.finalize({ from: owner });
      const actual = await this.token.owner();
      actual.should.equal(wallet);
    });
  });
  // トークンが余っているケース
  describe('remaining tokens', () => {
    // 残っているトークンはFund側で保持する
    it('should store to MidFree fund if tokens are remain', async function () {
      // await advanceToBlock(this.startBlock - 1);
      await increaseTimeTo(this.startTime + duration.weeks(3));

      // ether * rate = sold amount
      // 30,000 * 1,200 = 36,000,000
      await this.crowdsale.send(ether(30000));

      // offered amount - sold amount = remain
      // 50,000,000 - 36,000,000 = 14,000,000
      const remainingTokens = ether(14000000);

      let expect = ether(TestConstant.initialFundTokenAmount);
      let actual = await this.token.balanceOf(wallet);
      await actual.should.be.bignumber.equal(expect);

      await increaseTimeTo(this.afterEndTime);
      await this.crowdsale.finalize({ from: owner });

      expect = expect.plus(remainingTokens);
      actual = await this.token.balanceOf(wallet);
      await actual.should.be.bignumber.equal(expect);
    });
    // 投資されない場合の終了時の確認
    it('should not care about goal, to keep code simple', async function () {
      let expect = ether(TestConstant.initialFundTokenAmount);
      let actual = await this.token.balanceOf(wallet);
      await actual.should.be.bignumber.equal(expect);

      const goalReached = await this.crowdsale.goalReached();
      await goalReached.should.equal(false);

      await increaseTimeTo(this.afterEndTime);
      await this.crowdsale.finalize({ from: owner });

      expect = ether(TestConstant.allTokenAmount);
      actual = await this.token.balanceOf(wallet);
      await actual.should.be.bignumber.equal(expect);
    });
    // finalize処理されてもETHが集まっていないとgoalReachedはfalse
    it('should goalReached() be false even if mint remaining tokens', async function () {
      await increaseTimeTo(this.afterEndTime);
      await this.crowdsale.finalize({ from: owner });

      // goalReached() does not care about minted MidFree token amount because it depends weiRaised.
      const goalReached = await this.crowdsale.goalReached();
      await goalReached.should.equal(false);
    });
    // 綺麗に全てのトークンが交換されたケース
    it('should not do anything if no remaining token', async function () {
      // No remaining token already.
      const capSameAsInitialMidFreeFundBalance = initialMidFreeFundBalance;
      this.crowdsale = await MidFreeCoinCrowdsale.new(this.startTime, this.endTime,
        rate.base, wallet, capSameAsInitialMidFreeFundBalance, ether(tokenCap), initialMidFreeFundBalance,
        ether(goal), { from: owner });

      this.token = MidFreeCoin.at(await this.crowdsale.token());

      const expect = ether(TestConstant.initialFundTokenAmount);
      let actual = await this.token.balanceOf(wallet);
      await actual.should.be.bignumber.equal(expect);

      await increaseTimeTo(this.startTime + duration.weeks(3));

      // cap reached.
      await this.crowdsale.send(ether(TestConstant.maxETH));

      await increaseTimeTo(this.afterEndTime);
      await this.crowdsale.finalize({ from: owner });

      actual = await this.token.balanceOf(wallet);
      // MAXのetherを送って800MFC余るため
      await actual.should.be.bignumber.equal(expect.plus(ether(800)));
    });
  });
  // 確定が拒否される場合
  describe('reject finalize', () => {
    // 終了前には確定処理ができない
    it('cannot be finalized before ending', async function () {
      await this.crowdsale.finalize({ from: owner }).should.be.rejectedWith(EVMThrow);
    });
    // 上限の99%に到達していない場合は確定処理できない
    it('can not be finalized when token cap is not reached 99%', async function () {
      await increaseTimeTo(this.startTime + duration.weeks(3));
      await this.crowdsale.send(thresholdOfEther.minus(ether(1)));// 9444 O 9445 O 9446 X 9447 X
      await this.crowdsale.finalize({ from: owner }).should.be.rejectedWith(EVMThrow);
    });
    // オーナー以外が確定処理できない
    it('cannot be finalized by third party after ending', async function () {
      await increaseTimeTo(this.endTime);
      await this.crowdsale.finalize({ from: thirdparty }).should.be.rejectedWith(EVMThrow);
    });
    // 2度確定処理はできない
    it('cannot be finalized twice', async function () {
      await increaseTimeTo(this.afterEndTime);
      await this.crowdsale.finalize({ from: owner });
      await this.crowdsale.finalize({ from: owner }).should.be.rejectedWith(EVMThrow);
    });
  });
});
