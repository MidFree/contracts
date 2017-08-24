pragma solidity ^0.4.11;

import 'zeppelin-solidity/contracts/token/MintableToken.sol';

contract MidFreeCoin is MintableToken {
  string public name = "MIDFREE COIN";
  string public symbol = "MFC";
  uint256 public decimals = 18;
}