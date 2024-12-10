// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@matterlabs/zksync-contracts/l2/system-contracts/interfaces/IAccount.sol";
import "@matterlabs/zksync-contracts/l2/system-contracts/libraries/TransactionHelper.sol";
import "@matterlabs/zksync-contracts/l2/system-contracts/libraries/SystemContractHelper.sol";
import "@matterlabs/zksync-contracts/l2/system-contracts/libraries/EfficientCall.sol";
import {BOOTLOADER_FORMAL_ADDRESS, NONCE_HOLDER_SYSTEM_CONTRACT, DEPLOYER_SYSTEM_CONTRACT, INonceHolder} from "@matterlabs/zksync-contracts/l2/system-contracts/Constants.sol";

/**
 * @author Matter Labs
 * @notice The default implementation of account.
 * @dev The bytecode of the contract is set by default for all addresses for which no other bytecodes are deployed.
 * @notice If the caller is not a bootloader always returns empty data on call, just like EOA does.
 * @notice If it is delegate called always returns empty data, just like EOA does.
 */
contract OTKAccount is IAccount {
    using TransactionHelper for *;

    mapping(address => bool) otks;

    /**
     * @dev Simulate the behavior of the EOA if the caller is not the bootloader.
     * Essentially, for all non-bootloader callers halt the execution with empty return data.
     * If all functions will use this modifier AND the contract will implement an empty payable fallback()
     * then the contract will be indistinguishable from the EOA when called.
     */
    modifier ignoreNonBootloader() {
        if (msg.sender != BOOTLOADER_FORMAL_ADDRESS) {
            // If function was called outside of the bootloader, behave like an EOA.
            assembly {
                return(0, 0)
            }
        }
        // Continue execution if called from the bootloader.
        _;
    }

    /**
     * @dev Simulate the behavior of the EOA if it is called via `delegatecall`.
     * Thus, the default account on a delegate call behaves the same as EOA on Ethereum.
     * If all functions will use this modifier AND the contract will implement an empty payable fallback()
     * then the contract will be indistinguishable from the EOA when called.
     */
    modifier ignoreInDelegateCall() {
        address codeAddress = SystemContractHelper.getCodeAddress();
        if (codeAddress != address(this)) {
            // If the function was delegate called, behave like an EOA.
            assembly {
                return(0, 0)
            }
        }

        // Continue execution if not delegate called.
        _;
    }


    constructor(address[] memory list) {
        for (uint256 i = 0; i < list.length; i++) {
            otks[list[i]] = true;
        }
    }

    /// @notice Validates the transaction & increments nonce.
    /// @dev The transaction is considered accepted by the account if
    /// the call to this function by the bootloader does not revert
    /// and the nonce has been set as used.
    /// @param _suggestedSignedHash The suggested hash of the transaction to be signed by the user.
    /// This is the hash that is signed by the EOA by default.
    /// @param _transaction The transaction structure itself.
    /// @dev Besides the params above, it also accepts unused first paramter "_txHash", which
    /// is the unique (canonical) hash of the transaction.
    function validateTransaction(
        bytes32, // _txHash
        bytes32 _suggestedSignedHash,
        Transaction calldata _transaction
    ) external payable override ignoreNonBootloader ignoreInDelegateCall returns (bytes4 magic) {
        magic = _validateTransaction(_suggestedSignedHash, _transaction);
    }

    /// @notice Inner method for validating transaction and increasing the nonce
    /// @param _suggestedSignedHash The hash of the transaction signed by the EOA
    /// @param _transaction The transaction.
    function _validateTransaction(
        bytes32 _suggestedSignedHash,
        Transaction calldata _transaction
    ) internal returns (bytes4 magic) {
        // Note, that nonce holder can only be called with "isSystem" flag.
        SystemContractsCaller.systemCallWithPropagatedRevert(
            uint32(gasleft()),
            address(NONCE_HOLDER_SYSTEM_CONTRACT),
            0,
            abi.encodeCall(INonceHolder.incrementMinNonceIfEquals, (_transaction.nonce))
        );

        // Even though for the transaction types present in the system right now,
        // we always provide the suggested signed hash, this should not be
        // always expected. In case the bootloader has no clue what the default hash
        // is, the bytes32(0) will be supplied.
        bytes32 txHash = _suggestedSignedHash != bytes32(0) ? _suggestedSignedHash : _transaction.encodeHash();

        // The fact there is are enough balance for the account
        // should be checked explicitly to prevent user paying for fee for a
        // transaction that wouldn't be included on Ethereum.
        uint256 totalRequiredBalance = _transaction.totalRequiredBalance();
        require(totalRequiredBalance <= address(this).balance, "Not enough balance for fee + value");

        if (_isValidSignature(txHash, _transaction.signature)) {
            magic = ACCOUNT_VALIDATION_SUCCESS_MAGIC;
        } else {
            magic = bytes4(0);
        }
    }

    /// @notice Method called by the bootloader to execute the transaction.
    /// @param _transaction The transaction to execute.
    /// @dev It also accepts unused _txHash and _suggestedSignedHash parameters:
    /// the unique (canonical) hash of the transaction and the suggested signed
    /// hash of the transaction.
    function executeTransaction(
        bytes32, // _txHash
        bytes32, // _suggestedSignedHash
        Transaction calldata _transaction
    ) external payable override ignoreNonBootloader ignoreInDelegateCall {
        _execute(_transaction);
    }

    /// @notice Method that should be used to initiate a transaction from this account by an external call.
    /// @dev The custom account is supposed to implement this method to initiate a transaction on behalf
    /// of the account via L1 -> L2 communication. However, the default account can initiate a transaction
    /// from L1, so we formally implement the interface method, but it doesn't execute any logic.
    /// @param _transaction The transaction to execute.
    function executeTransactionFromOutside(Transaction calldata _transaction) external payable override {
        // Behave the same as for fallback/receive, just execute nothing, returns nothing
    }

    /// @notice Inner method for executing a transaction.
    /// @param _transaction The transaction to execute.
    function _execute(Transaction calldata _transaction) internal {
        address to = address(uint160(_transaction.to));
        uint128 value = Utils.safeCastToU128(_transaction.value);
        bytes calldata data = _transaction.data;
        uint32 gas = Utils.safeCastToU32(gasleft());

        // Note, that the deployment method from the deployer contract can only be called with a "systemCall" flag.
        bool isSystemCall;
        if (to == address(DEPLOYER_SYSTEM_CONTRACT) && data.length >= 4) {
            bytes4 selector = bytes4(data[:4]);
            // Check that called function is the deployment method,
            // the others deployer method is not supposed to be called from the default account.
            isSystemCall =
                selector == DEPLOYER_SYSTEM_CONTRACT.create.selector ||
                selector == DEPLOYER_SYSTEM_CONTRACT.create2.selector ||
                selector == DEPLOYER_SYSTEM_CONTRACT.createAccount.selector ||
                selector == DEPLOYER_SYSTEM_CONTRACT.create2Account.selector;
        }
        bool success = EfficientCall.rawCall(gas, to, value, data, isSystemCall);
        if (!success) {
            EfficientCall.propagateRevert();
        }
    }

    /// @notice Validation that the ECDSA signature of the transaction is correct.
    /// @param _hash The hash of the transaction to be signed.
    /// @param _signature The signature of the transaction.
    /// @return EIP1271_SUCCESS_RETURN_VALUE if the signaure is correct. It reverts otherwise.
    function _isValidSignature(bytes32 _hash, bytes memory _signature) internal returns (bool) {
        require(_signature.length == 65, "Signature length is incorrect");
        uint8 v;
        bytes32 r;
        bytes32 s;
        // Signature loading code
        // we jump 32 (0x20) as the first slot of bytes contains the length
        // we jump 65 (0x41) per signature
        // for v we load 32 bytes ending with v (the first 31 come from s) then apply a mask
        assembly {
            r := mload(add(_signature, 0x20))
            s := mload(add(_signature, 0x40))
            v := and(mload(add(_signature, 0x41)), 0xff)
        }
        require(v == 27 || v == 28, "v is neither 27 nor 28");

        address recoveredAddress = ecrecover(_hash, v, r, s);

        if (recoveredAddress == address(this) && recoveredAddress != address(0)) {
            return true;
        }

        if (otks[recoveredAddress] == true) {
            otks[recoveredAddress] = false;
            return true;
        }

        return false;
    }

    /// @notice Method for paying the bootloader for the transaction.
    /// @param _transaction The transaction for which the fee is paid.
    /// @dev It also accepts unused _txHash and _suggestedSignedHash parameters:
    /// the unique (canonical) hash of the transaction and the suggested signed
    /// hash of the transaction.
    function payForTransaction(
        bytes32, // _txHash
        bytes32, // _suggestedSignedHash
        Transaction calldata _transaction
    ) external payable ignoreNonBootloader ignoreInDelegateCall {
        bool success = _transaction.payToTheBootloader();
        require(success, "Failed to pay the fee to the operator");
    }

    /// @notice Method, where the user should prepare for the transaction to be
    /// paid for by a paymaster.
    /// @dev Here, the account should set the allowance for the smart contracts
    /// @param _transaction The transaction.
    /// @dev It also accepts unused _txHash and _suggestedSignedHash parameters:
    /// the unique (canonical) hash of the transaction and the suggested signed
    /// hash of the transaction.
    function prepareForPaymaster(
        bytes32, // _txHash
        bytes32, // _suggestedSignedHash
        Transaction calldata _transaction
    ) external payable ignoreNonBootloader ignoreInDelegateCall {
        _transaction.processPaymasterInput();
    }

    fallback() external payable {
        // fallback of default account shouldn't be called by bootloader under no circumstances
        assert(msg.sender != BOOTLOADER_FORMAL_ADDRESS);

        // If the contract is called directly, behave like an EOA
    }

    receive() external payable {
        // If the contract is called directly, behave like an EOA
    }
}
