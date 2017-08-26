pragma solidity ^0.4.13;

import './lib/MultiSigWallet.sol';

/**
 * The Multisignature wallet contract of MidFree project.
*/
contract MidFreeFund is MultiSigWallet {

  function MidFreeFund(address[] _owners, uint _required)
  public
  validRequirement(_owners.length, _required)
  MultiSigWallet(_owners, _required)
  {
  }
}
