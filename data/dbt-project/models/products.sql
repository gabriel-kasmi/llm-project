select * from {{ source('orders_model', 'products') }}
