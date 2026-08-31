"""Initial complete schema from scratch

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2026-08-26 13:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '0001_initial_schema'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. permissions
    op.create_table(
        'permissions',
        sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('module', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_permissions_id'), 'permissions', ['id'], unique=False)
    op.create_index(op.f('ix_permissions_name'), 'permissions', ['name'], unique=True)

    # 2. roles
    op.create_table(
        'roles',
        sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_roles_id'), 'roles', ['id'], unique=False)
    op.create_index(op.f('ix_roles_name'), 'roles', ['name'], unique=True)

    # 3. role_permissions
    op.create_table(
        'role_permissions',
        sa.Column('role_id', sa.Integer(), nullable=False),
        sa.Column('permission_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['permission_id'], ['permissions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('role_id', 'permission_id')
    )

    # 4. companies
    op.create_table(
        'companies',
        sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
        sa.Column('company_name', sa.String(length=200), nullable=False),
        sa.Column('joining_date', sa.String(length=50), nullable=True),
        sa.Column('is_rbs', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('rbs_type', sa.String(length=20), nullable=True, server_default='Debit'),
        sa.Column('contact_person', sa.String(length=100), nullable=True),
        sa.Column('contact_phone', sa.String(length=30), nullable=True),
        sa.Column('contact_email', sa.String(length=100), nullable=True),
        sa.Column('bank_name', sa.String(length=100), nullable=True),
        sa.Column('account_number', sa.String(length=50), nullable=True),
        sa.Column('ifsc_code', sa.String(length=20), nullable=True),
        sa.Column('branch_name', sa.String(length=100), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('city', sa.String(length=50), nullable=True),
        sa.Column('state', sa.String(length=50), nullable=True),
        sa.Column('pincode', sa.String(length=20), nullable=True),
        sa.Column('bank_platform', sa.String(length=100), nullable=True),
        sa.Column('virtual_account_no', sa.String(length=100), nullable=True),
        sa.Column('routing_no', sa.String(length=50), nullable=True),
        sa.Column('accountant_name', sa.String(length=100), nullable=True),
        sa.Column('bank_data', sa.Text(), nullable=True),
        sa.Column('account_mail', sa.String(length=150), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_companies_company_name'), 'companies', ['company_name'], unique=False)
    op.create_index(op.f('ix_companies_id'), 'companies', ['id'], unique=False)

    # 5. partners
    op.create_table(
        'partners',
        sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
        sa.Column('partner_name', sa.String(length=200), nullable=False),
        sa.Column('joining_date', sa.String(length=50), nullable=True),
        sa.Column('partner_type', sa.String(length=50), nullable=True, server_default='Service'),
        sa.Column('partner_share_percentage', sa.Float(), nullable=True),
        sa.Column('is_rbs', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('rbs_type', sa.String(length=20), nullable=True, server_default='Credit'),
        sa.Column('contact_person', sa.String(length=100), nullable=True),
        sa.Column('contact_phone', sa.String(length=30), nullable=True),
        sa.Column('contact_email', sa.String(length=100), nullable=True),
        sa.Column('bank_name', sa.String(length=100), nullable=True),
        sa.Column('account_number', sa.String(length=50), nullable=True),
        sa.Column('ifsc_code', sa.String(length=20), nullable=True),
        sa.Column('branch_name', sa.String(length=100), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('city', sa.String(length=50), nullable=True),
        sa.Column('state', sa.String(length=50), nullable=True),
        sa.Column('pincode', sa.String(length=20), nullable=True),
        sa.Column('bank_platform', sa.String(length=100), nullable=True),
        sa.Column('virtual_account_no', sa.String(length=100), nullable=True),
        sa.Column('routing_no', sa.String(length=50), nullable=True),
        sa.Column('accountant_name', sa.String(length=100), nullable=True),
        sa.Column('bank_data', sa.Text(), nullable=True),
        sa.Column('account_mail', sa.String(length=150), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_partners_id'), 'partners', ['id'], unique=False)
    op.create_index(op.f('ix_partners_partner_name'), 'partners', ['partner_name'], unique=False)

    # 6. accounts
    op.create_table(
        'accounts',
        sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
        sa.Column('account_name', sa.String(length=150), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=False, server_default='Company'),
        sa.Column('account_type', sa.String(length=50), nullable=False, server_default='Partner'),
        sa.Column('gst_number', sa.String(length=50), nullable=True),
        sa.Column('bank_name', sa.String(length=100), nullable=True),
        sa.Column('account_number', sa.String(length=50), nullable=True),
        sa.Column('ifsc_code', sa.String(length=20), nullable=True),
        sa.Column('branch_name', sa.String(length=100), nullable=True),
        sa.Column('contact_person', sa.String(length=100), nullable=True),
        sa.Column('contact_phone', sa.String(length=30), nullable=True),
        sa.Column('contact_email', sa.String(length=100), nullable=True),
        sa.Column('contact_address', sa.Text(), nullable=True),
        sa.Column('city', sa.String(length=50), nullable=True),
        sa.Column('state', sa.String(length=50), nullable=True),
        sa.Column('pincode', sa.String(length=20), nullable=True),
        sa.Column('shipment_type', sa.String(length=100), nullable=True),
        sa.Column('purchase_company', sa.String(length=150), nullable=True),
        sa.Column('company_id', sa.Integer(), nullable=True),
        sa.Column('partner_id', sa.Integer(), nullable=True),
        sa.Column('partner_type', sa.String(length=50), nullable=True),
        sa.Column('partner_share_percentage', sa.Float(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('required_documents', sa.Text(), nullable=True),
        sa.Column('uploaded_documents', sa.Text(), nullable=True),
        sa.Column('shipping_enabled', sa.Boolean(), nullable=True, server_default='1'),
        sa.Column('default_shipping_partner', sa.String(length=100), nullable=True, server_default='FedEx Express'),
        sa.Column('born_date', sa.String(length=50), nullable=True),
        sa.Column('user_name', sa.String(length=100), nullable=True),
        sa.Column('balance_usd', sa.Float(), nullable=True),
        sa.Column('total_orders', sa.Integer(), nullable=True),
        sa.Column('total_listings', sa.Integer(), nullable=True),
        sa.Column('first_payment', sa.Boolean(), nullable=True, server_default='0'),
        sa.Column('brand_gtin', sa.String(length=100), nullable=True),
        sa.Column('dor', sa.String(length=150), nullable=True),
        sa.Column('bank_payoneer', sa.Text(), nullable=True),
        sa.Column('winning_listing', sa.String(length=150), nullable=True),
        sa.Column('listing_strategy', sa.String(length=150), nullable=True),
        sa.Column('mark_status', sa.String(length=50), nullable=True, server_default='Active'),
        sa.Column('mail', sa.String(length=150), nullable=True),
        sa.Column('mail_pass', sa.String(length=100), nullable=True),
        sa.Column('account_pass', sa.String(length=100), nullable=True),
        sa.Column('card_code', sa.String(length=100), nullable=True),
        sa.Column('authenticator_code', sa.String(length=100), nullable=True),
        sa.Column('support_file', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['partner_id'], ['partners.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_accounts_account_name'), 'accounts', ['account_name'], unique=False)
    op.create_index(op.f('ix_accounts_id'), 'accounts', ['id'], unique=False)

    # 7. users
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
        sa.Column('email', sa.String(length=100), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=100), nullable=False),
        sa.Column('phone', sa.String(length=20), nullable=True),
        sa.Column('is_admin', sa.Boolean(), nullable=True, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default='1'),
        sa.Column('role_id', sa.Integer(), nullable=True),
        sa.Column('is_partner', sa.Boolean(), nullable=True, server_default='0'),
        sa.Column('account_id', sa.Integer(), nullable=True),
        sa.Column('account_name', sa.String(length=100), nullable=True),
        sa.Column('assigned_employee_id', sa.Integer(), nullable=True),
        sa.Column('assigned_employee_name', sa.String(length=100), nullable=True),
        sa.Column('onboarding_status', sa.String(length=50), nullable=True, server_default='Draft'),
        sa.Column('requires_shipping', sa.Boolean(), nullable=True, server_default='1'),
        sa.Column('shipping_partner', sa.String(length=100), nullable=True, server_default='FedEx Express'),
        sa.Column('personal_details', sa.Text(), nullable=True),
        sa.Column('bank_name', sa.String(length=100), nullable=True),
        sa.Column('account_number', sa.String(length=50), nullable=True),
        sa.Column('ifsc_code', sa.String(length=20), nullable=True),
        sa.Column('salary_summary', sa.Text(), nullable=True),
        sa.Column('responsibilities', sa.Text(), nullable=True),
        sa.Column('allowed_companies', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['account_id'], ['accounts.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['assigned_employee_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)

    # 8. inventory
    op.create_table(
        'inventory',
        sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
        sa.Column('product_name', sa.String(length=200), nullable=False),
        sa.Column('sku', sa.String(length=100), nullable=True),
        sa.Column('category', sa.String(length=100), nullable=True),
        sa.Column('stock_quantity', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('price', sa.Float(), nullable=False, server_default='0'),
        sa.Column('other_details', sa.Text(), nullable=True),
        sa.Column('partner_id', sa.Integer(), nullable=True),
        sa.Column('partner_name', sa.String(length=200), nullable=True),
        sa.Column('image_url', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_inventory_id'), 'inventory', ['id'], unique=False)
    op.create_index(op.f('ix_inventory_partner_id'), 'inventory', ['partner_id'], unique=False)
    op.create_index(op.f('ix_inventory_product_name'), 'inventory', ['product_name'], unique=False)
    op.create_index(op.f('ix_inventory_sku'), 'inventory', ['sku'], unique=True)

    # 9. orders
    op.create_table(
        'orders',
        sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
        sa.Column('order_number', sa.String(length=50), nullable=True),
        sa.Column('order_date', sa.Date(), nullable=True),
        sa.Column('order_process_date', sa.Date(), nullable=True),
        sa.Column('last_delivery_date', sa.Date(), nullable=True),
        sa.Column('company', sa.String(length=100), nullable=True, server_default='ADBH'),
        sa.Column('shipment_id', sa.String(length=100), nullable=True),
        sa.Column('seller_account', sa.String(length=150), nullable=True),
        sa.Column('product_id', sa.Integer(), nullable=True),
        sa.Column('product_name', sa.String(length=255), nullable=False),
        sa.Column('product_url', sa.String(length=500), nullable=True),
        sa.Column('product_image', sa.Text(), nullable=True),
        sa.Column('qty', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('product_price', sa.Float(), nullable=True, server_default='0'),
        sa.Column('price_usd', sa.Float(), nullable=False, server_default='0'),
        sa.Column('commission_price', sa.Float(), nullable=True, server_default='0'),
        sa.Column('order_status', sa.String(length=100), nullable=True, server_default='ADBH'),
        sa.Column('p', sa.Boolean(), nullable=True, server_default='0'),
        sa.Column('purchase_cost_inr', sa.Float(), nullable=True, server_default='0'),
        sa.Column('admin_cost_share', sa.Float(), nullable=True, server_default='0'),
        sa.Column('oi', sa.String(length=100), nullable=True),
        sa.Column('arriving_date', sa.String(length=100), nullable=True),
        sa.Column('gst', sa.String(length=150), nullable=True),
        sa.Column('buyer_name', sa.String(length=100), nullable=False),
        sa.Column('shipment_address_1', sa.Text(), nullable=True),
        sa.Column('shipment_address_2', sa.Text(), nullable=True),
        sa.Column('city', sa.String(length=100), nullable=True),
        sa.Column('state', sa.String(length=100), nullable=True),
        sa.Column('zip_code', sa.String(length=50), nullable=True),
        sa.Column('mobile_number', sa.String(length=50), nullable=True),
        sa.Column('country', sa.String(length=100), nullable=True, server_default='USA'),
        sa.Column('account_id', sa.Integer(), nullable=True),
        sa.Column('account_name', sa.String(length=150), nullable=True),
        sa.Column('delivery_service', sa.String(length=100), nullable=True),
        sa.Column('shipment_cost', sa.Float(), nullable=True, server_default='0'),
        sa.Column('status', sa.String(length=50), nullable=True, server_default='Pending'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['account_id'], ['accounts.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['product_id'], ['inventory.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_orders_id'), 'orders', ['id'], unique=False)
    op.create_index(op.f('ix_orders_order_number'), 'orders', ['order_number'], unique=False)

    # 10. purchases
    op.create_table(
        'purchases',
        sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
        sa.Column('order_id', sa.Integer(), nullable=False),
        sa.Column('order_date', sa.Date(), nullable=False),
        sa.Column('product_name', sa.String(length=200), nullable=False),
        sa.Column('purchase_value', sa.Float(), nullable=False, server_default='0'),
        sa.Column('other_cost', sa.Float(), nullable=False, server_default='0'),
        sa.Column('extra_cost', sa.Float(), nullable=False, server_default='0'),
        sa.Column('delivery_code', sa.String(length=100), nullable=True),
        sa.Column('estimated_shipment_date', sa.Date(), nullable=True),
        sa.Column('account_name', sa.String(length=150), nullable=True),
        sa.Column('purchase_partner_name', sa.String(length=150), nullable=True),
        sa.Column('payment_status', sa.String(length=50), nullable=True, server_default='Paid'),
        sa.Column('notes', sa.String(length=255), nullable=True),
        sa.Column('company', sa.String(length=100), nullable=True),
        sa.Column('qty', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('sku', sa.String(length=100), nullable=True),
        sa.Column('gst_type', sa.String(length=50), nullable=True, server_default='GST'),
        sa.Column('bank', sa.String(length=150), nullable=True),
        sa.Column('po_number', sa.String(length=100), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='Pending'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['order_id'], ['orders.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_purchases_id'), 'purchases', ['id'], unique=False)

    # 11. shipments
    op.create_table(
        'shipments',
        sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
        sa.Column('order_id', sa.Integer(), nullable=False),
        sa.Column('shipment_partner', sa.String(length=100), nullable=False),
        sa.Column('tracking_id', sa.String(length=100), nullable=False),
        sa.Column('product_name', sa.String(length=200), nullable=False),
        sa.Column('product_image', sa.Text(), nullable=True),
        sa.Column('weight', sa.Float(), nullable=False, server_default='0'),
        sa.Column('dimensions', sa.String(length=100), nullable=True),
        sa.Column('length', sa.Float(), nullable=True, server_default='0'),
        sa.Column('width', sa.Float(), nullable=True, server_default='0'),
        sa.Column('height', sa.Float(), nullable=True, server_default='0'),
        sa.Column('volumetric_weight', sa.Float(), nullable=True, server_default='0'),
        sa.Column('awb_number', sa.String(length=100), nullable=True),
        sa.Column('forwarding_number', sa.String(length=100), nullable=True),
        sa.Column('domestic_cost', sa.Float(), nullable=True, server_default='0'),
        sa.Column('international_cost', sa.Float(), nullable=True, server_default='0'),
        sa.Column('dump_cost', sa.Float(), nullable=True, server_default='0'),
        sa.Column('label_cost_usd', sa.Float(), nullable=True, server_default='0'),
        sa.Column('exchange_rate', sa.Float(), nullable=True, server_default='99'),
        sa.Column('label_cost_inr', sa.Float(), nullable=True, server_default='0'),
        sa.Column('shipment_cost', sa.Float(), nullable=False, server_default='0'),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='In Transit'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['order_id'], ['orders.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_shipments_id'), 'shipments', ['id'], unique=False)
    op.create_index(op.f('ix_shipments_tracking_id'), 'shipments', ['tracking_id'], unique=False)

    # 12. employee_salaries
    op.create_table(
        'employee_salaries',
        sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('base_salary', sa.Float(), nullable=True, server_default='0'),
        sa.Column('hra', sa.Float(), nullable=True, server_default='0'),
        sa.Column('da', sa.Float(), nullable=True, server_default='0'),
        sa.Column('special_allowance', sa.Float(), nullable=True, server_default='0'),
        sa.Column('bonus', sa.Float(), nullable=True, server_default='0'),
        sa.Column('deductions', sa.Float(), nullable=True, server_default='0'),
        sa.Column('net_salary', sa.Float(), nullable=True, server_default='0'),
        sa.Column('effective_from', sa.Date(), nullable=True),
        sa.Column('payment_mode', sa.String(length=20), nullable=True, server_default='Bank'),
        sa.Column('status', sa.String(length=20), nullable=True, server_default='Active'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_employee_salaries_id'), 'employee_salaries', ['id'], unique=False)
    op.create_index(op.f('ix_employee_salaries_user_id'), 'employee_salaries', ['user_id'], unique=False)

    # 13. employee_assets
    op.create_table(
        'employee_assets',
        sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('asset_name', sa.String(length=100), nullable=False),
        sa.Column('asset_type', sa.String(length=50), nullable=False),
        sa.Column('asset_tag', sa.String(length=50), nullable=True),
        sa.Column('serial_number', sa.String(length=100), nullable=True),
        sa.Column('assigned_date', sa.Date(), nullable=True),
        sa.Column('returned_date', sa.Date(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=True, server_default='Assigned'),
        sa.Column('condition', sa.String(length=50), nullable=True, server_default='Good'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_employee_assets_id'), 'employee_assets', ['id'], unique=False)
    op.create_index(op.f('ix_employee_assets_user_id'), 'employee_assets', ['user_id'], unique=False)

    # 14. employee_documents
    op.create_table(
        'employee_documents',
        sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('document_type', sa.String(length=100), nullable=False),
        sa.Column('document_name', sa.String(length=200), nullable=False),
        sa.Column('file_url', sa.Text(), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('uploaded_at', sa.DateTime(), nullable=True),
        sa.Column('verified', sa.Boolean(), nullable=True, server_default='0'),
        sa.Column('verified_at', sa.DateTime(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_employee_documents_id'), 'employee_documents', ['id'], unique=False)
    op.create_index(op.f('ix_employee_documents_user_id'), 'employee_documents', ['user_id'], unique=False)

    # 15. expense_claims
    op.create_table(
        'expense_claims',
        sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('currency', sa.String(length=10), nullable=True, server_default='INR'),
        sa.Column('category', sa.String(length=50), nullable=True, server_default='Other'),
        sa.Column('receipt_url', sa.Text(), nullable=True),
        sa.Column('claim_date', sa.Date(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=True, server_default='Pending'),
        sa.Column('approved_by_id', sa.Integer(), nullable=True),
        sa.Column('approved_at', sa.DateTime(), nullable=True),
        sa.Column('rejection_reason', sa.Text(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['approved_by_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_expense_claims_id'), 'expense_claims', ['id'], unique=False)
    op.create_index(op.f('ix_expense_claims_user_id'), 'expense_claims', ['user_id'], unique=False)

    # 16. tasks
    op.create_table(
        'tasks',
        sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
        sa.Column('ticket_code', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('assignee_id', sa.Integer(), nullable=True),
        sa.Column('assigned_by_id', sa.Integer(), nullable=True),
        sa.Column('priority', sa.String(length=50), nullable=False, server_default='Medium'),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='To Do'),
        sa.Column('due_date', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['assigned_by_id'], ['users.id']),
        sa.ForeignKeyConstraint(['assignee_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_tasks_assignee_id'), 'tasks', ['assignee_id'], unique=False)
    op.create_index(op.f('ix_tasks_assigned_by_id'), 'tasks', ['assigned_by_id'], unique=False)
    op.create_index(op.f('ix_tasks_id'), 'tasks', ['id'], unique=False)
    op.create_index(op.f('ix_tasks_ticket_code'), 'tasks', ['ticket_code'], unique=True)

    # 17. task_history
    op.create_table(
        'task_history',
        sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
        sa.Column('task_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('action', sa.String(length=255), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['task_id'], ['tasks.id']),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_task_history_id'), 'task_history', ['id'], unique=False)
    op.create_index(op.f('ix_task_history_task_id'), 'task_history', ['task_id'], unique=False)
    op.create_index(op.f('ix_task_history_user_id'), 'task_history', ['user_id'], unique=False)

    # 18. monthly_admin_costs
    op.create_table(
        'monthly_admin_costs',
        sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
        sa.Column('month', sa.String(length=20), nullable=False),
        sa.Column('admin_cost', sa.Float(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_monthly_admin_costs_id'), 'monthly_admin_costs', ['id'], unique=False)
    op.create_index(op.f('ix_monthly_admin_costs_month'), 'monthly_admin_costs', ['month'], unique=True)


def downgrade() -> None:
    op.drop_table('monthly_admin_costs')
    op.drop_table('task_history')
    op.drop_table('tasks')
    op.drop_table('expense_claims')
    op.drop_table('employee_documents')
    op.drop_table('employee_assets')
    op.drop_table('employee_salaries')
    op.drop_table('shipments')
    op.drop_table('purchases')
    op.drop_table('orders')
    op.drop_table('inventory')
    op.drop_table('users')
    op.drop_table('accounts')
    op.drop_table('partners')
    op.drop_table('companies')
    op.drop_table('role_permissions')
    op.drop_table('roles')
    op.drop_table('permissions')
