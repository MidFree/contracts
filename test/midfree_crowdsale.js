import ether from '../utilities/ether';
import advanceToBlock from './helpers/advanceToBlock';
import EVMThrow from './helpers/EVMThrow';

import { MidFreeCoin, MidFreeFund, MidFreeCoinCrowdsale, BigNumber, cap, tokenCap, rate, icoStartTime,
  initialMidFreeFundBalance, should, goal, setTimingToBaseTokenRate, whiteList,
} from './helpers/midfree_helper';

contract('MidFreeCoinCrowdsale', ([investor, wallet, purchaser]) => {
  const someOfEtherAmount = ether(42);
  const expectedTokenAmount = new BigNumber(rate.base).mul(someOfEtherAmount);
  const expectedInitialTokenAmount = expectedTokenAmount.add(initialMidFreeFundBalance);

  before(async () => {
    await setTimingToBaseTokenRate();
  });

  beforeEach(async function () {
    this.startBlock = web3.eth.blockNumber + 10;
    this.endBlock = web3.eth.blockNumber + 20;

    this.crowdsale = await MidFreeCoinCrowdsale.new(this.startBlock, icoStartTime, this.endBlock,
      rate.base, wallet, ether(cap), ether(tokenCap), initialMidFreeFundBalance, ether(goal), whiteList);

    this.token = MidFreeCoin.at(await this.crowdsale.token());
  });
  // クラウドセールの初期化のテスト
  describe('initialized correctly', () => {
    // Fundのアドレスが正しいこと
    it('should be correct fund address', async () => {
      const fund = await MidFreeFund.deployed();
      const cs = await MidFreeCoinCrowdsale.deployed();
      const expect = await fund.address;
      const actual = await cs.wallet();
      actual.should.be.equal(expect);
    });
    // トークンがMidFreeCoinのインスタンスであること
    it('should token be instance of MidFreeCoin', async function () {
      this.token.should.be.an.instanceof(MidFreeCoin);
    });
    // Fundが最初に1億枚のトークンを持っていること
    it('should MidFree fund has 100 million tokens.', async function () {
      const expect = ether(100000000);
      const actual = await this.token.balanceOf(wallet);
      await actual.should.be.bignumber.equal(expect);
    });
    // トータルのトークン量が1億枚であること
    it('should total supply be 100 million tokens.', async function () {
      const expect = ether(100000000);
      const actual = await this.token.totalSupply();
      await actual.should.be.bignumber.equal(expect);
    });
    // トークンの上限枚数(外部への発行枚数)
    // offering amount = token cap - total supply.
    it('should offering amount be 22 million tokens.', async function () {
      const expect = ether(22000000);
      const totalSupply = await this.token.totalSupply();
      const crowdSaleCap = await this.crowdsale.tokenCap();
      const actual = crowdSaleCap.sub(totalSupply);
      await actual.should.be.bignumber.equal(expect);
    });
  });
  // トークンのオーナーが正しいこと
  describe('token owner', () => {
    it('should be token owner', async function () {
      const owner = await this.token.owner();
      owner.should.equal(this.crowdsale.address);
    });
  });
  // 投資を受けるテスト
  describe('accepting payments', () => {
    // 開始前はrejectする
    it('should reject payments before start', async function () {
      await this.crowdsale.send(someOfEtherAmount).should.be.rejectedWith(EVMThrow);
      await this.crowdsale.buyTokens(investor, { from: purchaser, value: someOfEtherAmount })
        .should.be.rejectedWith(EVMThrow);
    });
    // 開始前のrejectでもETHは失わない
    it('should not lose ETH if payments were rejected before start', async function () {
      const beforeSend = web3.eth.getBalance(investor);
      await this.crowdsale.sendTransaction(
        { value: someOfEtherAmount, from: investor, gasPrice: 0 })
        .should.be.rejectedWith(EVMThrow);

      const afterRejected = web3.eth.getBalance(investor);
      await afterRejected.should.be.bignumber.equal(beforeSend);
    });
    // 開始後は送金を受け付ける
    it('should accept payments after start', async function () {
      await advanceToBlock(this.startBlock - 1);
      await this.crowdsale.send(someOfEtherAmount).should.be.fulfilled;
      await this.crowdsale.buyTokens(investor, { value: someOfEtherAmount, from: purchaser }).should.be.fulfilled;
    });
    // 終了後は送金をrejectする
    it('should reject payments after end', async function () {
      await advanceToBlock(this.endBlock);
      await this.crowdsale.send(someOfEtherAmount).should.be.rejectedWith(EVMThrow);
      await this.crowdsale.buyTokens(investor, { value: someOfEtherAmount, from: purchaser })
        .should.be.rejectedWith(EVMThrow);
    });
    // 終了後に送金をrejectしてもETHを失わない
    it('should not lose ETH if payments were rejected after end', async function () {
      await advanceToBlock(this.endBlock);
      const beforeSend = web3.eth.getBalance(investor);
      await this.crowdsale.sendTransaction(
        { value: someOfEtherAmount, from: investor, gasPrice: 0 })
        .should.be.rejectedWith(EVMThrow);

      const afterRejected = web3.eth.getBalance(investor);
      await afterRejected.should.be.bignumber.equal(beforeSend);
    });
  });
  // トークン量のテスト
  describe('token amount adjustments', () => {
    // Etherを受け取ってもfundが1億枚持っているままである
    it('should fund has 100 million tokens even if received ether', async function () {
      await advanceToBlock(this.startBlock - 1);
      await this.crowdsale.send(someOfEtherAmount);
      const expect = ether(100000000);
      const actual = await this.token.balanceOf(wallet);
      await actual.should.be.bignumber.equal(expect);
    });
    // 10,000Ether受け取り後には全体トークン量が12200万枚になっている
    // initial + ( received ether * decimals ) = total supply
    // 100,000,000 + ( 10,000 * 2,200 ) = 122,000,000
    it('should total supply be 122 million tokens after received 10,000 ether', async function () {
      await advanceToBlock(this.startBlock - 1);
      await this.crowdsale.send(ether(10000));
      const expect = ether(122000000);
      const actual = await this.token.totalSupply();
      await actual.should.be.bignumber.equal(expect);
    });
  });
  // トランザクションが送られる購入
  describe('high-level purchase', () => {
    beforeEach(async function () {
      await advanceToBlock(this.startBlock);
    });

    it('should log purchase', async function () {
      const { logs } = await this.crowdsale.sendTransaction({ value: someOfEtherAmount, from: investor });

      const event = logs.find(e => e.event === 'TokenPurchase');

      should.exist(event);
      event.args.purchaser.should.equal(investor);
      event.args.beneficiary.should.equal(investor);
      event.args.value.should.be.bignumber.equal(someOfEtherAmount);
      event.args.amount.should.be.bignumber.equal(expectedTokenAmount);
    });

    it('should increase totalSupply', async function () {
      await this.crowdsale.send(someOfEtherAmount);
      const totalSupply = await this.token.totalSupply();
      totalSupply.should.be.bignumber.equal(expectedInitialTokenAmount);
    });

    it('should assign tokens to sender', async function () {
      await this.crowdsale.sendTransaction({ value: someOfEtherAmount, from: investor });
      const balance = await this.token.balanceOf(investor);
      balance.should.be.bignumber.equal(expectedTokenAmount);
    });

    it('should not forward funds to wallet', async function () {
      const pre = web3.eth.getBalance(wallet);
      await this.crowdsale.sendTransaction({ value: someOfEtherAmount, from: investor });
      const post = web3.eth.getBalance(wallet);
      post.should.be.bignumber.equal(pre);
    });
  });
  // buyTokenで購入
  describe('low-level purchase', () => {
    beforeEach(async function () {
      await advanceToBlock(this.startBlock);
    });

    it('should log purchase', async function () {
      const { logs } = await this.crowdsale.buyTokens(investor, { value: someOfEtherAmount, from: purchaser });

      const event = logs.find(e => e.event === 'TokenPurchase');

      should.exist(event);
      event.args.purchaser.should.equal(purchaser);
      event.args.beneficiary.should.equal(investor);
      event.args.value.should.be.bignumber.equal(someOfEtherAmount);
      event.args.amount.should.be.bignumber.equal(expectedTokenAmount);
    });

    it('should increase totalSupply', async function () {
      await this.crowdsale.buyTokens(investor, { value: someOfEtherAmount, from: purchaser });
      const totalSupply = await this.token.totalSupply();
      totalSupply.should.be.bignumber.equal(expectedInitialTokenAmount);
    });

    it('should assign tokens to beneficiary', async function () {
      await this.crowdsale.buyTokens(investor, { value: someOfEtherAmount, from: purchaser });
      const balance = await this.token.balanceOf(investor);
      balance.should.be.bignumber.equal(expectedTokenAmount);
    });

    it('should not forward funds to wallet', async function () {
      const pre = web3.eth.getBalance(wallet);
      await this.crowdsale.buyTokens(investor, { value: someOfEtherAmount, from: purchaser });
      const post = web3.eth.getBalance(wallet);
      post.should.be.bignumber.equal(pre);
    });
  });
  // トークンセール終了時のテスト
  describe('ending', () => {
    it('should be ended only after end', async function () {
      let ended = await this.crowdsale.hasEnded();
      ended.should.equal(false);
      await advanceToBlock(this.endBlock + 1);
      ended = await this.crowdsale.hasEnded();
      ended.should.equal(true);
    });
  });
});
