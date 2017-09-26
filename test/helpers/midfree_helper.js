import moment from 'moment';
import ether from '../../utilities/ether';
import increaseTime from '../helpers/increaseTime';

const fs = require('fs');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const chaiBigNumber = require('chai-bignumber');

const crowdsaleParams = JSON.parse(fs.readFileSync('./config/Crowdsale.json', 'utf8'));

// exports
export const TestConstant = JSON.parse(fs.readFileSync('./test/helpers/TestConstant.json', 'utf8'));


export const BigNumber = web3.BigNumber;
export const should = chai
  .use(chaiAsPromised)
  .use(chaiBigNumber(BigNumber))
  .should();

export const MidFreeCoin = artifacts.require('MidFreeCoin.sol');
export const MidFreeFund = artifacts.require('MidFreeFund.sol');
export const MidFreeCoinCrowdsale = artifacts.require('MidFreeCoinCrowdsale.sol');
export const icoStartTime = crowdsaleParams.icoStartTime;
export const icoEndTime = crowdsaleParams.icoEndTime;
export const cap = crowdsaleParams.cap;
export const tokenCap = crowdsaleParams.tokenCap;
export const rate = crowdsaleParams.rate;
export const initialMidFreeFundBalance = ether(crowdsaleParams.initialMidfreeFundBalance);
export const goal = new BigNumber(crowdsaleParams.goal);

// Set time to token sale start time.
export async function setTimingToTokenSaleStart() {
  const now = await Math.floor(Date.now() / 1000);
  const increaseDuration = icoStartTime - now;
  await increaseTime(moment.duration(increaseDuration, 'second'));
}

// Set time to after week4 when token rate is base.
export async function setTimingToBaseTokenRate() {
  await setTimingToTokenSaleStart();
  await increaseTime(moment.duration(3, 'weeks'));
}
