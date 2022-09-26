module DynamicPayment::paymentChannel {
use std::string;
use std::signer;
use std::error;
use aptos_framework::coin;

struct PaymentChannel has key {
     paymentName: string::String,
     paymentAddress: address
}

/// There is no message present
const ENO_MESSAGE: u64 = 0;

public fun get(addr: address):address acquires PaymentChannel{
    assert!(exists<PaymentChannel>(addr), error::not_found(ENO_MESSAGE));
    *&borrow_global<PaymentChannel>(addr).paymentAddress
}

public entry fun set_payment_address(account: signer, paymentName: string::String, paymentAddress: address)acquires PaymentChannel{
    let account_addr = signer::address_of(&account);
    if (!exists<PaymentChannel>(account_addr)) {
        move_to(&account, PaymentChannel {
        paymentName:paymentName,
        paymentAddress:paymentAddress,
       });
    }else{
        let account_res = borrow_global_mut<PaymentChannel>(account_addr); 
        account_res.paymentName = paymentName;
        account_res.paymentAddress = paymentAddress;
    }
  }

public entry fun payment<CoinType>(account: &signer, paymentChannel: address, amount: u64) acquires PaymentChannel{

    assert!(exists<PaymentChannel>(paymentChannel), error::not_found(ENO_MESSAGE));

    // deposit coin to the token_owner
    let coin = coin::withdraw<CoinType>(account, amount);

    let channelInfo = borrow_global_mut<PaymentChannel>(paymentChannel); 
    coin::deposit(channelInfo.paymentAddress, coin);

}
}
