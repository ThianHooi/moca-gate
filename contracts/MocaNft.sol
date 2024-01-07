// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@thirdweb-dev/contracts/base/ERC721Base.sol";
import "@thirdweb-dev/contracts/extension/PermissionsEnumerable.sol";
import "@thirdweb-dev/contracts/lib/CurrencyTransferLib.sol";

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

contract MocaNft is ERC721Base, PermissionsEnumerable {
    using EnumerableSet for EnumerableSet.UintSet;
    using EnumerableSet for EnumerableSet.AddressSet;

    /// @dev Mapping to store the staking time of each NFT
    mapping(uint256 => uint256) public stakingTime;

    /// @dev Set to keep store of staked NFTs
    EnumerableSet.UintSet private stakedNFTs;

    /// @dev List of accounts that have staked their NFTs.
    EnumerableSet.AddressSet private _stakers;

    /// @dev Mapping from staked token-id to staker address.
    mapping(uint256 => address) public stakerAddress;

    // Field to store the stake duration for reward
    uint256 public stakeDurationForReward;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _stakeDurationForReward,
        address _royaltyRecipient,
        uint128 _royaltyBps
    ) ERC721Base(msg.sender, _name, _symbol, _royaltyRecipient, _royaltyBps) {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(MINTER_ROLE, msg.sender);
        stakeDurationForReward = _stakeDurationForReward;
    }

    function stakeNFT(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        require(!stakedNFTs.contains(tokenId), "Already staked");

        transferFrom(msg.sender, address(this), tokenId);

        stakingTime[tokenId] = block.timestamp;
        stakedNFTs.add(tokenId);

        _stakers.add(msg.sender);
    }

    function getStakingDuration(
        uint256 tokenId
    ) external view returns (uint256) {
        require(stakedNFTs.contains(tokenId), "Not staked");

        return block.timestamp - stakingTime[tokenId];
    }

    function hasStakedNFT(address _staker) external view returns (bool) {
        return _stakers.contains(_staker);
    }

    function isEligibleForReward(uint256 tokenId) external view returns (bool) {
        require(stakedNFTs.contains(tokenId), "Not staked");

        uint256 stakingDuration = block.timestamp - stakingTime[tokenId];
        return stakingDuration >= stakeDurationForReward;
    }

    function withdrawNFT(uint256 tokenId) external {
        require(stakedNFTs.contains(tokenId), "Not staked");

        transferFrom(address(this), msg.sender, tokenId);

        stakedNFTs.remove(tokenId);

        _stakers.remove(msg.sender);
    }
}
