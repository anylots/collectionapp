module DynamicPayment::appcolla {
use std::string;
use std::signer;
use std::error;

struct PaymentInfo has key {
     paymentName: string::String,
     paymentAddress: address
}

/// There is no message present
const ENO_MESSAGE: u64 = 0;

public fun get(addr: address):string::String acquires CollInfo{
    assert!(exists<CollInfo>(addr), error::not_found(ENO_MESSAGE));
    *&borrow_global<CollInfo>(addr).msg
}

public entry fun set_payment_address(account: signer, paymentName: string::String, paymentAddress: string::String)acquires CollInfo{
    let account_addr = signer::address_of(&account);
    if (!exists<PaymentInfo>(account_addr)) {
        move_to(&account, PaymentInfo {
        paymentName:paymentName,
        paymentAddress:paymentAddress,
       });
    }else{
        let account_res = borrow_global_mut<PaymentInfo>(account_addr); 
        account_res.paymentName = paymentName;
        account_res.paymentAddress = paymentAddress;
    }
  }

public entry fun payment<CoinType>(account: signer, amount:u64){
    let coin_owner = signer::address_of(&account);
    // deposit coin to the token_owner
    let coin = coin::withdraw<CoinType>(coin_owner, amount);
    coin::deposit(paymentAddress, coin);

}
  
}
