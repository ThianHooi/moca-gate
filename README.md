# moca-gated

## Description
This project demonstrates a simple gating mechanism for NFT ownership. *For example, user has to own a specific NFT to be able to claim a reward.*

**Requirement:**
1. NFT must be staked for at least 1 week before it can pass the gating requirements
2. Delegated wallets should be supported to prove ownership
3. Users should not be able to register multiple emails by simply delegating to different wallets

## How it works
> NFT must be staked for at least 1 week before it can pass the gating requirements

This is achieved by storing the timestamp when the NFT is staked. When user tries to claim the reward, the contract will check if the timestamp is at least 1 week ago.

```solidity
uint256 stakingDuration = block.timestamp - stakingTime[tokenId];
bool isValidForReward = stakingDuration >= stakeDurationForReward;
```

> Delegated wallets should be supported to prove ownership

In order to allow the use of [Delegate](https://delegate.xyz/) in local Hardhat environment, Delegate's contracts are duplicated in `/contracts/delegate-registry`. The `DelegateRegistry` contract is deployed locally and the address is passed to `MocaNft` contract.

To allow proving ownership via delegated wallets, the `MocaNft` contract will check if the `msg.sender` is the owner of the NFT or the owner of the delegated wallet.

```solidity
bool isDelegateValid = IDelegateRegistry(DELEGATE_REGISTRY)
                .checkDelegateForERC721(
                    msg.sender,
                    _cold,
                    address(this),
                    tokenId,
                    ""
                );
```

> Users should not be able to register multiple emails by simply delegating to different wallets

This is achieved by setting a flag once the reward for the NFT is claimed. The flag is set to `true` when the reward is claimed. When user tries to claim the reward, the contract will check if the flag is set to `false`.

```solidity
mapping(uint256 => bool) public rewardClaimed;

bool isRewardClaimed = rewardClaimed[tokenId];
```

## How to run
1. Install dependencies
```bash
yard add
```

2. Compile contracts
```bash
yarn run compile
```

3. Start local Hardhat node
```bash
yarn run hardhat_node
```

4. Run test scripts on ***another terminal***
```bash
yarn run test
```

## Test results
```markdown
    Minting
      ✔ Owner should be able to mint RRCNFT token (421ms)
      ✔ Non-owner should not be able to mint Moca NFT token
      ✔ Owner should be able to mint Moca NFT token to another account
    Staking
      ✔ NFT owner should be able to stake NFT (51ms)
      ✔ Non-NFT owner should not be able to stake NFT (45ms)
      ✔ `isEligibleForReward` should return false when NFT is staked less than the duration set (52ms)
      ✔ `isEligibleForReward` should return true after NFT is staked more than the duration set (49ms)
    Delegation of NFT
      ✔ NFT owner should be able to delegate NFT (62ms)
      ✔ NFT owner should be able to prove ownership with delegated wallet (72ms)
      ✔ NFT owner should be able to claim reward with delegated wallet (94ms)
      ✔ NFT owner should be not be able to claim reward again after claiming once (103ms)
      ✔ NFT owner should be not be able to claim reward with multiple delegated wallet (182ms)
```

## What can be improved
1. Improve staking mechanism, as current implementation requires users to transfer the NFT to the contract address
2. Add more test cases
   1. Security test cases
   2. Edge cases
3. Gas optimization
