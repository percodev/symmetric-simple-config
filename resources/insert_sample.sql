------------------------------------------------------------------------------
-- Clear and load SymmetricDS Configuration
------------------------------------------------------------------------------

delete from sym_trigger_router;
delete from sym_trigger;
delete from sym_router;
delete from sym_channel where channel_id in ('items');
delete from sym_node_group_link;
delete from sym_node_group;
delete from sym_node_host;
delete from sym_node_identity;
delete from sym_node_security;
delete from sym_node;

------------------------------------------------------------------------------
-- Channels
------------------------------------------------------------------------------

-- Channel "items"
insert into sym_channel 
(channel_id, processing_order, max_batch_size, enabled, description)
values('items', 1, 100000, 1, 'base perco channel');

------------------------------------------------------------------------------
-- Node Groups
------------------------------------------------------------------------------

insert into sym_node_group (node_group_id) values ('corp');
insert into sym_node_group (node_group_id) values ('store');

------------------------------------------------------------------------------
-- Node Group Links
------------------------------------------------------------------------------

-- Corp sends changes to Store when Store pulls from Corp
insert into sym_node_group_link (source_node_group_id, target_node_group_id, data_event_action) values ('corp', 'store', 'W');

-- Store sends changes to Corp when Store pushes to Corp
insert into sym_node_group_link (source_node_group_id, target_node_group_id, data_event_action) values ('store', 'corp', 'P');

------------------------------------------------------------------------------
-- Triggers
------------------------------------------------------------------------------

{{TRIGGERS}}

------------------------------------------------------------------------------
-- Routers
------------------------------------------------------------------------------

-- Default router sends all data from corp to store 
insert into sym_router 
(router_id,source_node_group_id,target_node_group_id,router_type,create_time,last_update_time)
values('corp_2_store', 'corp', 'store', 'default',current_timestamp, current_timestamp);

-- Default router sends all data from store to corp
insert into sym_router 
(router_id,source_node_group_id,target_node_group_id,router_type,create_time,last_update_time)
values('store_2_corp', 'store', 'corp', 'default',current_timestamp, current_timestamp);

-- Column match router will subset data from corp to specific store
insert into sym_router 
(router_id,source_node_group_id,target_node_group_id,router_type,router_expression,create_time,last_update_time)
values('corp_2_one_store', 'corp', 'store', 'column','STORE_ID=:EXTERNAL_ID or OLD_STORE_ID=:EXTERNAL_ID',current_timestamp, current_timestamp);


------------------------------------------------------------------------------
-- Trigger Routers
------------------------------------------------------------------------------

{{TRIGGERS_ROUTERS}}

SET @@auto_increment_increment={{AUTO_INCR_INCREMENT}};
SET @@auto_increment_offset={{AUTO_INCR_OFFSET}};