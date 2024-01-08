import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { http, zeroAddress } from 'viem';
import { hardhat } from 'viem/chains';
import { DelegateV2 } from '@delegatexyz/sdk';

const RPC_URL = 'http://127.0.0.1:8545/';

describe('MocaNft', function () {
  async function deployMocaNFTFixture() {
    const [owner, otherAccount, otherAccount2] = await ethers.getSigners();

    const DelegateRegistry = await ethers.getContractFactory(
      'DelegateRegistry'
    );
    const delegateRegistry = await DelegateRegistry.deploy();
    const delegateRegistryContractAddress = await delegateRegistry.getAddress();

    const MocaNft = await ethers.getContractFactory('MocaNft');
    const mocaNft = await MocaNft.deploy(
      'MOCA NFT',
      'MOCA',
      604800,
      owner.address,
      1,
      delegateRegistryContractAddress
    );

    return { mocaNft, owner, otherAccount, otherAccount2, delegateRegistry };
  }

  describe('Minting', function () {
    it('Owner should be able to mint RRCNFT token', async function () {
      const { mocaNft, owner } = await loadFixture(deployMocaNFTFixture);

      const mintTx = await mocaNft.mintTo(owner.address, '');

      await mintTx.wait();

      const mocaNftBalance = await mocaNft.balanceOf(owner.address);

      expect(mocaNftBalance).to.be.equal(1);
    });

    it('Non-owner should not be able to mint Moca NFT token', async function () {
      const { mocaNft, otherAccount } = await loadFixture(deployMocaNFTFixture);
      await expect(
        mocaNft.connect(otherAccount).mintTo(otherAccount.address, '')
      ).to.be.reverted;
    });

    it('Owner should be able to mint Moca NFT token to another account', async function () {
      const { mocaNft, owner, otherAccount } = await loadFixture(
        deployMocaNFTFixture
      );

      const mintTx = await mocaNft.mintTo(otherAccount.address, '');
      await mintTx.wait();

      const mocaNftBalance = await mocaNft.balanceOf(otherAccount.address);

      expect(mocaNftBalance).to.be.equal(1);
    });
  });

  describe('Staking', function () {
    it('NFT owner should be able to stake NFT', async function () {
      const { mocaNft, owner, otherAccount } = await loadFixture(
        deployMocaNFTFixture
      );

      const mintTx = await mocaNft.mintTo(otherAccount.address, '');
      await mintTx.wait();

      const stakeTx = await mocaNft.connect(otherAccount).stakeNFT(0);
      await stakeTx.wait();

      const stakedNft = await mocaNft
        .connect(otherAccount)
        .hasStakedNFT(otherAccount.address, 0);

      expect(stakedNft).to.be.equal(true);
    });

    it('Non-NFT owner should not be able to stake NFT', async function () {
      const { mocaNft, owner, otherAccount } = await loadFixture(
        deployMocaNFTFixture
      );

      const mintTx = await mocaNft.mintTo(owner.address, '');
      await mintTx.wait();

      await expect(mocaNft.connect(otherAccount).stakeNFT(0)).to.be.reverted;
    });

    it('`isEligibleForReward` should return false when NFT is staked less than the duration set', async function () {
      const { mocaNft, owner } = await loadFixture(deployMocaNFTFixture);

      const mintTx = await mocaNft.mintTo(owner.address, '');
      await mintTx.wait();

      const stakeTx = await mocaNft.stakeNFT(0);
      await stakeTx.wait();

      // increase the time in Hardhat Network to 3 days later
      const timstampNow = await time.latest();
      await time.increaseTo(timstampNow + 3 * 24 * 60 * 60 + 1);

      const isEligibleForReward = await mocaNft.isEligibleForReward(
        0,
        zeroAddress
      );

      expect(isEligibleForReward).to.be.equal(false);
    });

    it('`isEligibleForReward` should return true after NFT is staked more than the duration set', async function () {
      const { mocaNft, owner } = await loadFixture(deployMocaNFTFixture);

      const mintTx = await mocaNft.mintTo(owner.address, '');
      await mintTx.wait();

      const stakeTx = await mocaNft.stakeNFT(0);
      await stakeTx.wait();

      // increase the time in Hardhat Network to 7 days later
      const timstampNow = await time.latest();
      await time.increaseTo(timstampNow + 7 * 24 * 60 * 60 + 1);

      const isEligibleForReward = await mocaNft.isEligibleForReward(
        0,
        zeroAddress
      );

      expect(isEligibleForReward).to.be.equal(true);
    });
  });

  describe('Delegation of NFT', () => {
    it('NFT owner should be able to delegate NFT', async function () {
      const { mocaNft, owner, otherAccount, delegateRegistry } =
        await loadFixture(deployMocaNFTFixture);

      const contractAddress = await mocaNft.getAddress();
      const delegateRegistryAddress = await delegateRegistry.getAddress();

      const mintTx = await mocaNft.mintTo(owner.address, '');
      await mintTx.wait();

      const v2 = new DelegateV2(
        // @ts-ignore
        http(RPC_URL),
        hardhat,
        owner
      );

      // @ts-ignore
      v2.contractConfig.address = delegateRegistryAddress;

      await v2.delegateERC721(
        otherAccount.address as `0x${string}`,
        contractAddress as `0x${string}`,
        0,
        undefined,
        true
      );

      const isDelegateForToken = await v2.checkDelegateForERC721(
        otherAccount.address as `0x${string}`,
        owner.address as `0x${string}`,
        contractAddress as `0x${string}`,
        0
      );

      expect(isDelegateForToken).to.be.equal(true);
    });

    it('NFT owner should be able to prove ownership with delegated wallet', async function () {
      const { mocaNft, owner, otherAccount, delegateRegistry } =
        await loadFixture(deployMocaNFTFixture);

      const contractAddress = await mocaNft.getAddress();
      const delegateRegistryAddress = await delegateRegistry.getAddress();

      const mintTx = await mocaNft.mintTo(owner.address, '');
      await mintTx.wait();

      const stakeTx = await mocaNft.stakeNFT(0);
      await stakeTx.wait();

      // increase the time in Hardhat Network to 7 days later
      const timstampNow = await time.latest();
      await time.increaseTo(timstampNow + 7 * 24 * 60 * 60 + 1);

      const v2 = new DelegateV2(
        // @ts-ignore
        http(RPC_URL),
        hardhat,
        owner
      );

      // @ts-ignore
      v2.contractConfig.address = delegateRegistryAddress;

      await v2.delegateERC721(
        otherAccount.address as `0x${string}`,
        contractAddress as `0x${string}`,
        0,
        undefined,
        true
      );

      const isEligibleForReward = await mocaNft
        .connect(otherAccount)
        .isEligibleForReward(0, owner.address);

      expect(isEligibleForReward).to.be.equal(true);
    });

    it('NFT owner should be able to claim reward with delegated wallet', async function () {
      const { mocaNft, owner, otherAccount, delegateRegistry } =
        await loadFixture(deployMocaNFTFixture);

      const contractAddress = await mocaNft.getAddress();
      const delegateRegistryAddress = await delegateRegistry.getAddress();

      const mintTx = await mocaNft.mintTo(owner.address, '');
      await mintTx.wait();

      const stakeTx = await mocaNft.stakeNFT(0);
      await stakeTx.wait();

      // increase the time in Hardhat Network to 7 days later
      const timstampNow = await time.latest();
      await time.increaseTo(timstampNow + 7 * 24 * 60 * 60 + 1);

      const v2 = new DelegateV2(
        // @ts-ignore
        http(RPC_URL),
        hardhat,
        owner
      );

      // @ts-ignore
      v2.contractConfig.address = delegateRegistryAddress;

      await v2.delegateERC721(
        otherAccount.address as `0x${string}`,
        contractAddress as `0x${string}`,
        0,
        undefined,
        true
      );

      await expect(mocaNft.connect(otherAccount).claimReward(0, owner.address))
        .not.to.be.reverted;
    });

    it('NFT owner should be not be able to claim reward again after claiming once', async function () {
      const { mocaNft, owner, otherAccount, delegateRegistry } =
        await loadFixture(deployMocaNFTFixture);

      const contractAddress = await mocaNft.getAddress();
      const delegateRegistryAddress = await delegateRegistry.getAddress();

      const mintTx = await mocaNft.mintTo(owner.address, '');
      await mintTx.wait();

      const stakeTx = await mocaNft.stakeNFT(0);
      await stakeTx.wait();

      // increase the time in Hardhat Network to 7 days later
      const timstampNow = await time.latest();
      await time.increaseTo(timstampNow + 7 * 24 * 60 * 60 + 1);

      const v2 = new DelegateV2(
        // @ts-ignore
        http(RPC_URL),
        hardhat,
        owner
      );

      // @ts-ignore
      v2.contractConfig.address = delegateRegistryAddress;

      await v2.delegateERC721(
        otherAccount.address as `0x${string}`,
        contractAddress as `0x${string}`,
        0,
        undefined,
        true
      );

      const claimRewardTx = await mocaNft
        .connect(otherAccount)
        .claimReward(0, owner.address);
      await claimRewardTx.wait();

      await expect(mocaNft.connect(otherAccount).claimReward(0, owner.address))
        .to.be.reverted;
    });
    
    it('NFT owner should be not be able to claim reward with multiple delegated wallet', async function () {
      const { mocaNft, owner, otherAccount, delegateRegistry, otherAccount2 } =
        await loadFixture(deployMocaNFTFixture);

      const contractAddress = await mocaNft.getAddress();
      const delegateRegistryAddress = await delegateRegistry.getAddress();

      const mintTx = await mocaNft.mintTo(owner.address, '');
      await mintTx.wait();

      const stakeTx = await mocaNft.stakeNFT(0);
      await stakeTx.wait();

      // increase the time in Hardhat Network to 7 days later
      const timstampNow = await time.latest();
      await time.increaseTo(timstampNow + 7 * 24 * 60 * 60 + 1);

      const v2 = new DelegateV2(
        // @ts-ignore
        http(RPC_URL),
        hardhat,
        owner
      );

      // @ts-ignore
      v2.contractConfig.address = delegateRegistryAddress;

      // delegate to otherAccount
      await v2.delegateERC721(
        otherAccount.address as `0x${string}`,
        contractAddress as `0x${string}`,
        0,
        undefined,
        true
      );
      
      // delegate to otherAccount2
      await v2.delegateERC721(
        otherAccount2.address as `0x${string}`,
        contractAddress as `0x${string}`,
        0,
        undefined,
        true
      );

      const claimRewardTx = await mocaNft
        .connect(otherAccount)
        .claimReward(0, owner.address);
      await claimRewardTx.wait();

      // otherAccount2 should not be able to claim reward, since otherAccount has already claimed on behalf of owner
      await expect(mocaNft.connect(otherAccount2).claimReward(0, owner.address))
        .to.be.reverted;
    });
  });
});
