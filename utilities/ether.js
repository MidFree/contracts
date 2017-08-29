// Copyright (c) 2016 Smart Contract Solutions, Inc.
// Released under the MIT license
// https://github.com/OpenZeppelin/zeppelin-solidity/blob/master/LICENSE
// weiをetherに変換する処理
export default function ether(n) {
  return new web3.BigNumber(web3.toWei(n, 'ether'));
}
