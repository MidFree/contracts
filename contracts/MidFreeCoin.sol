pragma solidity ^0.4.13;

import 'zeppelin/contracts/token/MintableToken.sol';

contract MidFreeCoin is MintableToken {
  string public constant name = "MIDFREE COIN";
  string public constant symbol = "MFC";
  uint256 public constant decimals = 18;
}