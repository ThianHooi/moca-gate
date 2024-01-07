import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('MocaNft', function () {
  async function deployMocaNFTFixture() {
    const [owner, otherAccount, otherAccount2] = await ethers.getSigners();

    const MocaNft = await ethers.getContractFactory('MocaNft');
    const mocaNft = await MocaNft.deploy(
      'MOCA NFT',
      'MOCA',
      604800,
      owner.address,
      1
    );

    return { mocaNft, owner, otherAccount, otherAccount2 };
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
      const { mocaNft, owner } = await loadFixture(deployMocaNFTFixture);

      const mintTx = await mocaNft.mintTo(owner.address, '');
      await mintTx.wait();

      const stakeTx = await mocaNft.stakeNFT(0);
      await stakeTx.wait();

      const stakedNft = await mocaNft.hasStakedNFT(owner.address);

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

      const isEligibleForReward = await mocaNft.isEligibleForReward(0);

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

      const isEligibleForReward = await mocaNft.isEligibleForReward(0);

      expect(isEligibleForReward).to.be.equal(true);
    });
  });
});
