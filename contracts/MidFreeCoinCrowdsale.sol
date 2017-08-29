pragma solidity ^0.4.13;

import './MidFreeCoin.sol';
import 'zeppelin/contracts/crowdsale/Crowdsale.sol';
import './WhitelistedCrowdsale.sol';


contract MidFreeCoinCrowdsale is WhitelistedCrowdsale {

  function MidFreeCoinCrowdsale(uint256 _startBlock, uint256 _endBlock, uint256 _rate, address _wallet) Crowdsale(_startBlock, _endBlock, _rate, _wallet) {
  }

  // creates the token to be sold.
  // override this method to have crowdsale of a specific MintableToken token.
  function createTokenContract() internal returns (MintableToken) {
    return new MidFreeCoin();
  }

}