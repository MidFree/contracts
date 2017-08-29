// import ether from '../utilities/ether';
// FIXME: merge to utility.
// 構文上インポートできないため重複して記述
function ether(n) {
  return new web3.BigNumber(web3.toWei(n, 'ether'));
}


const fs = require('fs');

const MidFreeCoin = artifacts.require('MidFreeCoin.sol');
const MidFreeCoinCrowdsale = artifacts.require('MidFreeCoinCrowdsale.sol');
const fundParams = JSON.parse(fs.readFileSync('../config/MidFreeFund.json', 'utf8'));
const crowdsaleParams = JSON.parse(fs.readFileSync('../config/Crowdsale.json', 'utf8'));

module.exports = function deployContract(deployer) {
  // クラウドセールが始まるブロックを現在のブロックの2ブロック後に設定
  const startBlock = web3.eth.blockNumber + 2;
  // 終了させるブロックの番号→300だと1時間ちょっと
  const endBlock = startBlock + 300;
  // EtherとMidFreeCoinの価値の比率
  const rate = new web3.BigNumber(1000);
  // ファンドのアドレス→マルチシグのものの方がセキュリティ的に良い
  const wallet = web3.eth.accounts[0];

  const actualInitialMidfreeFundBalance = ether(crowdsaleParams.initialMidFreeFundBalance);

  deployer.deploy(MidFreeCoin, fundParams.owners, fundParams.required).then(() =>
    deployer.deploy(MidFreeCoinCrowdsale, startBlock, endBlock, rate,
      wallet, actualInitialMidfreeFundBalance, crowdsaleParams.whiteList),
    // deployer.deploy(MidFreeCoinCrowdsale,wallet)
  );
};
