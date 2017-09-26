// 構文上インポートできないため重複して記述
function ether(n) {
  return new web3.BigNumber(web3.toWei(n, 'ether'));
}


const fs = require('fs');

const MidFreeFund = artifacts.require('MidFreeFund.sol');
const MidFreeCoinCrowdsale = artifacts.require('MidFreeCoinCrowdsale.sol');
const fundParams = JSON.parse(fs.readFileSync('../config/MidFreeFund.json', 'utf8'));
const crowdsaleParams = JSON.parse(fs.readFileSync('../config/Crowdsale.json', 'utf8'));

module.exports = function deployContract(deployer) {
  const actualCap = web3.toWei(crowdsaleParams.cap, 'ether');
  const actualTokenCap = ether(crowdsaleParams.tokenCap);
  const actualInitialMidfreeFundBalance = ether(crowdsaleParams.initialMidFreeFundBalance);
  const actualGoal = web3.toWei(crowdsaleParams.goal, 'ether');


  deployer.deploy(MidFreeFund, fundParams.owners, fundParams.required).then(() =>
    deployer.deploy(MidFreeCoinCrowdsale, crowdsaleParams.icoStartTime,
      crowdsaleParams.icoEndTime, crowdsaleParams.rate.base, MidFreeFund.address, actualCap,
      actualTokenCap, actualInitialMidfreeFundBalance, actualGoal, crowdsaleParams.whiteList),
  );
};
