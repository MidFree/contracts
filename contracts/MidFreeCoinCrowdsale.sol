pragma solidity ^0.4.13;

import 'zeppelin/contracts/crowdsale/CappedCrowdsale.sol';
import 'zeppelin/contracts/crowdsale/RefundableCrowdsale.sol';
import 'zeppelin/contracts/token/MintableToken.sol';
import 'zeppelin/contracts/lifecycle/Pausable.sol';
import './WhitelistedCrowdsale.sol';
import './MidFreeCoin.sol';


contract MidFreeCoinCrowdsale is CappedCrowdsale, RefundableCrowdsale, WhitelistedCrowdsale, Pausable {

  uint256 constant RATE_PRE_SALE = 50000;
  uint256 constant RATE_WEEK_1 = 1500;
  uint256 constant RATE_WEEK_2 = 1400;
  uint256 constant RATE_WEEK_3 = 1300;

  // ICO start date time.
  uint256 public icoStartTime;

  // The cap amount of MidFree tokens.
  uint256 public tokenCap;

  function MidFreeCoinCrowdsale(uint256 _startBlock, uint256 _icoStartTime, uint256 _endBlock, uint256 _rate, address _wallet, uint256 _cap, uint256 _tokenCap, uint256 _initialMidFreeFundBalance, uint256 _goal, address[] _whiteList) 
  Crowdsale(_startBlock, _endBlock, _rate, _wallet) 
  CappedCrowdsale(_cap)
  RefundableCrowdsale(_goal)
  WhitelistedCrowdsale(_whiteList)
  {
    icoStartTime = _icoStartTime;
    tokenCap = _tokenCap;

    token.mint(wallet, _initialMidFreeFundBalance);
  }

  // creates the token to be sold.
  // override this method to have crowdsale of a specific MintableToken token.
  function createTokenContract() internal returns (MintableToken) {
    return new MidFreeCoin();
  }

  // overriding CappedCrowdsale#validPurchase to add extra token cap logic
  // @return true if investors can buy at the moment
  function validPurchase() internal constant returns (bool) {
    bool withinTokenCap = token.totalSupply().add(msg.value.mul(getRate())) <= tokenCap;
    return super.validPurchase() && withinTokenCap;
  }

  // overriding CappedCrowdsale#hasEnded to add token cap logic
  // @return true if crowdsale event has ended
  // 少しのトークンが余ったとしても途中でfinalizeできるようにしている
  function hasEnded() public constant returns (bool) {
    uint256 threshold = tokenCap.div(100).mul(99);
    bool thresholdReached = token.totalSupply() >= threshold;
    return super.hasEnded() || thresholdReached;
  }

  // overriding RefundableCrowdsale#finalization
  // - To store remaining MidFree tokens.
  // - To minting unfinished because of our consensus algorithm.
  function finalization() internal {
    uint256 remaining = tokenCap.sub(token.totalSupply());

    if (remaining > 0) {
      token.mint(wallet, remaining);
    }

    // change MidfreeCoin owner to MidFreeFund.
    token.transferOwnership(wallet);

    // From RefundableCrowdsale#finalization
    if (goalReached()) {
      vault.close();
    } else {
      vault.enableRefunds();
    }
  }

  // overriding Crowdsale#buyTokens to rate customizable.
  // This is created to compatible PR below:
  // - https://github.com/OpenZeppelin/zeppelin-solidity/pull/317
  function buyTokens(address beneficiary) payable {
    require(!paused);
    require(beneficiary != 0x0);
    require(validPurchase());
    require(saleAccepting());

    uint256 weiAmount = msg.value;

    // for presale
    if ( isPresale() ) {
      checkLimit(weiAmount);
    }

    // calculate token amount to be created
    uint256 tokens = weiAmount.mul(getRate());

    // update state
    weiRaised = weiRaised.add(weiAmount);

    token.mint(beneficiary, tokens);
    TokenPurchase(msg.sender, beneficiary, weiAmount, tokens);

    forwardFunds();
  }

  // Custom rate.
  //
  // This is created to compatible PR below:
  // - https://github.com/OpenZeppelin/zeppelin-solidity/pull/317
  function getRate() constant returns (uint256) {
    uint256 currentRate = rate;

    // // We decided using `now` alias of `block.timestamp` instead `block.number`
    // // Because of same reason:
    // // - https://github.com/OpenZeppelin/zeppelin-solidity/issues/350
    if (isPresale()) {
      // before 2017/11/01 02:00 UTC
      currentRate = RATE_PRE_SALE;
    } else if (now <= icoStartTime.add(1 weeks)) {
      // before 2017/11/08 02:00 UTC
      currentRate = RATE_WEEK_1;
    } else if (now <= icoStartTime.add(2 weeks)) {
      // before 2017/11/15 02:00 UTC
      currentRate = RATE_WEEK_2;
    } else if (now <= icoStartTime.add(3 weeks)) {
      // before 2017/11/21 02:00 UTC
      currentRate = RATE_WEEK_3;
    }

    return currentRate;
  }

  // @return true if crowd sale is accepting.
  function saleAccepting() internal constant returns (bool) {
    return !isPresale() || isWhiteListMember(msg.sender);
  }

  // @return true if crowd sale is pre sale.
  function isPresale() internal constant returns (bool) {
    return now <= icoStartTime;
  }
}