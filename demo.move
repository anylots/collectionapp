module oneDollar_v1::luckybuy_coin_v1{
    use std::string::String as String;
    use std::error;
    use std::bcs;
    use aptos_std::event;
    use std::vector as vector;
    use std::signer::address_of as address_of;
    use aptos_std::simple_map as map;
    use aptos_framework::timestamp;
    use aptos_framework::coin;
    use aptos_framework::block;
    //use aptos_framework::aptos_coin;
    use aptos_framework::coin::Coin as Coin;

    const ONEDOLLAR_ADMIN : address = @oneDollar_v1;

    const CLAIM_DELAY_BLOCK: u64 = 100;
  
    const DOLLAR_ONLY_ADMIN:u64 = 1;

    const ONEDOLLARSMAP_NOT_FOUND:u64 = 2;
    
    const ONEDOLLAR_NOT_FOUND:u64 = 3;

    const SALE_NOT_ACTIVITY:u64 = 4;

    const TICKECTS_INSUFFICIENT:u64 = 5;


    public entry fun get_admin_address() : address{
        ONEDOLLAR_ADMIN
    }

    struct OneDollarsCoinCollection<phantom RewardCoin:key,phantom FundCoin:key> has key,store {
        onedollar_id_list:vector<u64>,
        //HashMap<onedollar_id,onedollar>
        onedollars_map: map::SimpleMap<u64,OneDollarCoin<RewardCoin,FundCoin>>,
    }

    struct OneDallorCoinClosed<phantom RewardCoin:key,phantom FundCoin:key> has  store,key {
        onedollar_id_list:vector<u64>,
        onedollars_map: map::SimpleMap<u64,OneDollarCoin<RewardCoin,FundCoin>>,
    }

    struct OneDollarCoin<phantom RewardCoin:key,phantom FundCoin:key> has store,key {
        description:String,
        total_tickets:u64,
        selled_tickets_list:vector<address>,
        start_time:u64,
        sell_out_time:u64,
        is_claimed:bool,
        selling_time:u64,
        luck_code:u64,
        reward: Coin<RewardCoin>,
        fund: Coin<FundCoin>
    }

    /*struct CreateRewardEvent has drop, store {
        description:String,
        onedollar_id:u64,
    }

    struct BuyTicketEvent has drop, store {
        block:u64,
        user:address,
        val:u64,
        onedollar_id:u64
    }*/

    public entry fun create_reward_coin<RewardCoin:key,FundCoin:key>(
        signer:&signer,
        description: String,
        coin_val: u64,
        total_tickets:u64,
        selling_time:u64
        )acquires OneDollarsCoinCollection{
            let reward_coin = coin::withdraw<RewardCoin>(signer,coin_val);
            let buy_coin = coin::withdraw<FundCoin>(signer,0);

            create_reward_internal<RewardCoin,FundCoin>(
                description,
                signer,
                reward_coin,
                buy_coin,
                total_tickets,
                selling_time
            );
        }

    public fun create_reward_internal<RewardCoin:key,FundCoin:key>(
        description: String,
        signer:&signer,
        coin: Coin<RewardCoin>,
        fund_coin:Coin<FundCoin>,
        total_tickets:u64,
        selling_time:u64
        )acquires OneDollarsCoinCollection{
        assert!(address_of(signer)==ONEDOLLAR_ADMIN, error::unauthenticated(DOLLAR_ONLY_ADMIN));
        
        if(!exists<OneDollarsCoinCollection<RewardCoin,FundCoin>>(ONEDOLLAR_ADMIN)){
            move_to(
                signer,
                OneDollarsCoinCollection{
                    onedollar_id_list: vector::empty<u64>(),
                    onedollars_map: map::create<u64,OneDollarCoin<RewardCoin,FundCoin>>()
                }
            );
        };

        let collection = borrow_global_mut<OneDollarsCoinCollection<RewardCoin,FundCoin>>(ONEDOLLAR_ADMIN);
        let onedollar_id = generate_onedollar_id();
        let coin_reward = coin::extract<RewardCoin>(&mut coin,total_tickets);
        coin::deposit<RewardCoin>(address_of(signer),coin);
        let onedollar = OneDollarCoin {
            description:description,
            total_tickets:total_tickets,
            selled_tickets_list:vector::empty<address>(),
            reward:coin_reward,
            is_claimed:false,
            sell_out_time:0,
            start_time: block::get_current_block_height(),
            selling_time:selling_time,
            luck_code:0,
            fund:coin::extract<FundCoin>(&mut fund_coin,0)
        };
        coin::deposit(ONEDOLLAR_ADMIN,fund_coin);
        map::add<u64,OneDollarCoin<RewardCoin,FundCoin>>(&mut collection.onedollars_map,onedollar_id,onedollar);
        vector::push_back<u64>(&mut collection.onedollar_id_list,onedollar_id);
        //let reward = borrow_global_mut<aptos_framework::coin::CoinStore<T>>(ONEDOLLAR_ADMIN);
    }


    public entry fun buy_ticket<RewardCoin:key , FundCoin:key>(signer:&signer, onedollar_id:u64, amount:u64,generate:u64) acquires OneDollarsCoinCollection {
        let fund_coin = coin::withdraw<FundCoin>(signer, amount);
        buy_ticket_internal<RewardCoin,FundCoin>(signer, onedollar_id, fund_coin,generate,amount);
    }

    public fun buy_ticket_internal<RewardCoin:key , FundCoin:key>(signer:&signer, onedollar_id:u64, fund_coin:Coin<FundCoin>,generate:u64,amount:u64) acquires OneDollarsCoinCollection {
        
        assert!(exists<OneDollarsCoinCollection<RewardCoin,FundCoin>>(ONEDOLLAR_ADMIN), error::not_found(ONEDOLLARSMAP_NOT_FOUND));
        let collection = borrow_global_mut<OneDollarsCoinCollection<RewardCoin,FundCoin>>(ONEDOLLAR_ADMIN);
        assert!(map::contains_key(&mut collection.onedollars_map,&onedollar_id),error::not_found(ONEDOLLAR_NOT_FOUND));
        let onedollar = map::borrow_mut(&mut collection.onedollars_map,&onedollar_id);
        assert!(sale_is_activity_internal(onedollar),error::unavailable(SALE_NOT_ACTIVITY));
        let (_,tickets_remain) = tickets_info_internal(onedollar);
        assert!(tickets_remain>=amount,error::invalid_argument(TICKECTS_INSUFFICIENT));
        let tickets_list =&mut onedollar.selled_tickets_list;
        coin::merge<FundCoin>(&mut onedollar.fund,fund_coin);
        let new_ticket = vector::empty<address>();
        let index = 0;
        while(index < amount){
            vector::push_back<address>(&mut new_ticket,address_of(signer));
            index = index +1;
        };
        vector::append<address>(tickets_list,new_ticket);
        if(tickets_remain==0){
            onedollar.luck_code = generate_lucky_code(onedollar.total_tickets,generate);
            let turnover = coin::extract<FundCoin>(&mut onedollar.fund,onedollar.total_tickets);
            coin::deposit<FundCoin>(ONEDOLLAR_ADMIN,turnover);
        }

    }

    public entry fun claim_and_refund<RewardCoin:key , FundCoin:key>(signer:&signer,onedollar_id:u64) acquires OneDollarsCoinCollection {
        
        let collection = borrow_global_mut<OneDollarsCoinCollection<RewardCoin,FundCoin>>(ONEDOLLAR_ADMIN);
        let onedollar = map::borrow_mut(&mut collection.onedollars_map,&onedollar_id);
        let activity = reward_is_activity_internal(onedollar);
        let tickets_list =&mut onedollar.selled_tickets_list;
        let buy_val=0;
        if(onedollar.luck_code!=0){
            assert!(activity,error::unavailable(SALE_NOT_ACTIVITY));
            if(is_winner(onedollar,address_of(signer))){
                let rewards = coin::extract<RewardCoin>(&mut onedollar.reward,onedollar.total_tickets);
                coin::deposit<RewardCoin>(address_of(signer),rewards);
                onedollar.is_claimed = true;
            }
        }
        else{
            let index = 0;
            while(index < vector::length(tickets_list)){
                if(vector::borrow<address>(tickets_list,index) == &address_of(signer)){
                    buy_val = buy_val +1;
                };
                index = index + 1;
            };
            let refund = coin::extract<FundCoin>(&mut onedollar.fund,index);
            coin::deposit<FundCoin>(address_of(signer),refund);
        };

    }

    fun is_winner<RewardCoin:key, FundCoin:key>(onedollar:&OneDollarCoin<RewardCoin,FundCoin>,account:address):bool{
        let tickets_list =&onedollar.selled_tickets_list;
        vector::borrow<address>(tickets_list,onedollar.luck_code) == &account
    }



    fun tickets_info_internal<RewardCoin:key, FundCoin:key>(onedollar:&OneDollarCoin<RewardCoin,FundCoin>):(u64,u64){
        //total tickets and selled tickets
        (onedollar.total_tickets,onedollar.total_tickets-vector::length<address>(&onedollar.selled_tickets_list))
    }

    fun sale_is_activity_internal<RewardCoin:key, FundCoin:key>(onedollar:&OneDollarCoin<RewardCoin,FundCoin>):bool{
        onedollar.start_time+onedollar.selling_time>= block::get_current_block_height()
    }

    fun reward_is_activity_internal<RewardCoin:key, FundCoin:key>(onedollar:&OneDollarCoin<RewardCoin,FundCoin>):bool{
        block::get_current_block_height()>=onedollar.sell_out_time+CLAIM_DELAY_BLOCK
    }

    fun generate_lucky_code(total:u64,seed:u64):u64{
        //TODO
        seed%total
    }

    fun generate_onedollar_id():u64{
        timestamp::now_seconds()
    }

}

