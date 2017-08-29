import { MidFreeCoin } from './helpers/midfree_helper';

contract('MidFreeCoin', () => {
  let token;

  beforeEach(async () => {
    token = await MidFreeCoin.new();
  });

  describe('inirialized correctly', () => {
    it('should be correct token name', async () => {
      const expect = 'MidFreeCoin';
      const actual = await token.name();
      actual.should.be.equal(expect);
    });
  });
});
