pragma solidity ^0.4.13;

import 'zeppelin/contracts/token/MintableToken.sol';

contract MidFreeCoin is MintableToken {
  string public name = "MIDFREE COIN";
  string public symbol = "MFC";
  uint256 public decimals = 18;
}