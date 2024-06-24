import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import {
    ERC721PenaltyFeePool,
    ERC20MockToken,
    ERC721MockToken,
    ERC721PenaltyFeeStakingFactory,
} from "../typechain";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";