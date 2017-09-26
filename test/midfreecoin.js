import { MidFreeCoin } from './helpers/midfree_helper';
import { advanceBlock } from './helpers/advanceToBlock';

contract('MidFreeCoin', (accounts) => {
  let token;

  before(async () => {
    await advanceBlock();
  });

  beforeEach(async () => {
    token = await MidFreeCoin.new();
  });
  // コンストラクタに関わるテスト
  describe('inirialized correctly', () => {
    // トークン名の検証
    it('should be correct token name', async () => {
      const expect = 'MidFreeCoin';
      const actual = await token.name();
      actual.should.be.equal(expect);
    });
    // トークンシンボルの検証
    it('should be correct token symbol', async () => {
      const expect = 'MFC';
      const actual = await token.symbol();
      actual.should.be.equal(expect);
    });
    // トークンの小数点の検証
    it('should be correct token decimals', async () => {
      const expect = 18;
      const actual = await token.decimals();
      actual.toNumber().should.be.equal(expect);
    });
    // トークンの小数点とetherの比較
    it('should be same decimals of ether', async () => {
      const expect = web3.toWei(1, 'ether');
      const tokenDecimals = await token.decimals();
      const actual = new web3.BigNumber(1 * (10 ** tokenDecimals));
      actual.toNumber().should.be.bignumber.equal(expect);
    });
    // 単独でデプロイした時にはスタートは0になっている
    it('should start with a totalSupply of 0 when deployed alone', async () => {
      const totalSupply = await token.totalSupply();

      assert.equal(totalSupply, 0);
    });
  });
  // 関数のテスト
  describe('functions', () => {
    // 作成直後はマイニングがfalse
    it('should return mintingFinished false after construction', async () => {
      const mintingFinished = await token.mintingFinished();

      assert.equal(mintingFinished, false);
    });
    // トークン量の初期化処理
    it('should mint a given amount of tokens to a given address', async () => {
      await token.mint(accounts[0], 100);

      const balance0 = await token.balanceOf(accounts[0]);
      assert(balance0, 100);

      const totalSupply = await token.totalSupply();
      assert(totalSupply, 100);
    });
  });
});
