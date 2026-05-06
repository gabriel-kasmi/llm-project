select * from {{ source('orders_model', 'users') }}
