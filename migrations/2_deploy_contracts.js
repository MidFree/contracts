const MidFreeCoinCrowdsale = artifacts.require('/MidFreeCoinCrowdsale.sol');

module.exports = function deployContract(deployer) {
  // クラウドセールが始まるブロックを現在のブロックの2ブロック後に設定
  const startBlock = web3.eth.blockNumber + 2;
  // 終了させるブロックの番号→300だと1時間ちょっと
  const endBlock = startBlock + 300;
  // EtherとMidFreeCoinの価値の比率
  const rate = new web3.BigNumber(1000);
  // ファンドのアドレス→マルチシグのものの方がセキュリティ的に良い
  const wallet = web3.eth.accounts[0];

  deployer.deploy(MidFreeCoinCrowdsale, startBlock, endBlock, rate, wallet);
};
