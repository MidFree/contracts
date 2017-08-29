pragma solidity ^0.4.13;

import 'zeppelin/contracts/token/MintableToken.sol';


contract MidFreeCoin is MintableToken {
  string public constant name = 'MidFreeCoin';
  string public constant symbol = 'MFC';
  // 18が一般的（weiと同じ単位になるから）
  uint256 public constant decimals = 18;
}