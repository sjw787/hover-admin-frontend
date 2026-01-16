# Multi-User Role System Implementation

This document describes the implementation of role-based access control (RBAC) for the Hovver Admin Dashboard Backend.

## Overview

The system now supports two user types:
- **Admins**: Full access to manage customers and upload/delete files
- **Customers**: View-only access to their own files and general-use files

## Key Features

### 1. User Roles and Groups
- **Cognito User Groups**: `Admins` and `Customers` groups in AWS Cognito
- **Custom Attributes**: `custom:customer_id` attribute for linking users to their S3 folders
- **Role-Based Authorization**: Middleware functions to enforce access control

### 2. Customer Management (Admin Only)
- Create new customer profiles with temporary passwords
- List all customers
- View customer details
- Update customer information (name, phone, enabled/disabled status)

### 3. S3 File Organization
Files are organized in S3 with the following structure:
```
bucket-name/
├── customers/
│   ├── {customer_id_1}/
│   │   ├── 2026/01/16/
│   │   │   └── file1_20260116_120000.jpg
│   │   └── 2026/01/17/
│   │       └── file2_20260117_140000.jpg
│   └── {customer_id_2}/
│       └── ...
└── general/
    ├── 2026/01/16/
    │   └── general_file1_20260116_120000.jpg
    └── 2026/01/17/
        └── general_file2_20260117_140000.jpg
```

### 4. API Endpoints

#### Customer Management (Admin Only)
- `POST /customers` - Create a new customer
- `GET /customers` - List all customers
- `GET /customers/{customer_id}` - Get customer details
- `PATCH /customers/{customer_id}` - Update customer profile

#### Image Management
- `POST /images/upload` - Upload image (Admin only)
  - Admins can specify `customer_id` query parameter or omit it for general folder
  - Customers receive 403 Forbidden
- `GET /images/list` - List images
  - Admins see all images across all folders
  - Customers see only their files + general folder files
- `DELETE /images/{key}` - Delete image (Admin only)

### 5. Authorization Helpers

New helper functions in `api/services/auth.py`:
- `require_admin()` - Dependency to require admin role
- `require_customer()` - Dependency to require customer role
- `get_user_role(user)` - Extract user role from JWT claims
- `get_customer_id(user)` - Extract customer_id from JWT claims

## Infrastructure Changes

### Terraform Updates

#### `terraform/cognito.tf`
- Added `custom:customer_id` schema attribute
- Added `Admins` and `Customers` user groups
- Updated client read/write attributes to include `custom:customer_id`

#### `terraform/iam.tf`
- Added admin operations permissions:
  - `cognito-idp:AdminCreateUser`
  - `cognito-idp:AdminSetUserPassword`
  - `cognito-idp:AdminAddUserToGroup`
  - `cognito-idp:AdminRemoveUserFromGroup`
  - `cognito-idp:AdminListGroupsForUser`
  - `cognito-idp:AdminUpdateUserAttributes`
  - `cognito-idp:AdminDeleteUser`
  - `cognito-idp:ListUsersInGroup`

## Usage Examples

### Creating a Customer (Admin)

```bash
POST /customers
{
  "email": "customer@example.com",
  "name": "John Doe",
  "temporary_password": "TempPass123!",
  "phone_number": "+12345678900"
}
```

Response:
```json
{
  "customer_id": "abc123-def456-ghi789",
  "email": "customer@example.com",
  "name": "John Doe",
  "phone_number": "+12345678900",
  "customer_folder": "customers/abc123-def456-ghi789",
  "created_date": "2026-01-16T12:00:00",
  "enabled": true
}
```

### Uploading an Image (Admin)

Upload to specific customer folder:
```bash
POST /images/upload?customer_id=abc123-def456-ghi789
Content-Type: multipart/form-data
Authorization: Bearer {admin_token}

file: [image file]
```

Upload to general folder:
```bash
POST /images/upload
Content-Type: multipart/form-data
Authorization: Bearer {admin_token}

file: [image file]
```

### Listing Images

As Admin (sees all files):
```bash
GET /images/list
Authorization: Bearer {admin_token}
```

As Customer (sees only their files + general):
```bash
GET /images/list
Authorization: Bearer {customer_token}
```

## Deployment

### 1. Apply Terraform Changes

```bash
cd terraform
terraform plan
terraform apply
```

This will:
- Add custom attribute to Cognito user pool
- Create Admins and Customers groups
- Update IAM policies

### 2. Create First Admin User

Use AWS Console or CLI to create an admin user and add them to the Admins group:

```bash
aws cognito-idp admin-create-user \
  --user-pool-id {pool-id} \
  --username admin@example.com \
  --user-attributes Name=email,Value=admin@example.com Name=name,Value="Admin User" \
  --temporary-password "TempPass123!"

aws cognito-idp admin-add-user-to-group \
  --user-pool-id {pool-id} \
  --username admin@example.com \
  --group-name Admins
```

### 3. Deploy Application

Build and push Docker image, then deploy to ECS as usual.

## Security Considerations

1. **Role Enforcement**: All endpoints check user roles via JWT claims
2. **Customer Isolation**: Customers can only access their own files + general files
3. **Admin Operations**: Only admins can create/modify customers and upload/delete files
4. **Temporary Passwords**: Customers must change password on first login
5. **S3 Organization**: Files are organized by customer_id, preventing accidental cross-customer access

## Future Enhancements

1. **DynamoDB for Customer Metadata**: Add richer customer profiles (company info, subscription tier, etc.)
2. **Email Invitations**: Use Cognito triggers to send email invitations with password setup links
3. **File Sharing**: Allow customers to share specific files with other customers
4. **Audit Logging**: Track all file operations (upload, download, delete) in CloudWatch
5. **Bulk Operations**: Batch upload/delete operations for admins
6. **Customer Self-Service**: Allow customers to update their own profile information

