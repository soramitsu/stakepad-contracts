// /*
// Factory Generic
// SPDX-License-Identifier: MIT
// */

// pragma solidity 0.8.25;
// import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

// contract GenericFactory is Ownable {

//     address public requestManager;
//     address[] public stakingPools;

//     constructor(address managerContract) Ownable(msg.sender) {
//         requestManager = managerContract;
//     }

//     function getPools() external view returns (address[] memory pools) {
//         pools = stakingPools;
//     }
// }