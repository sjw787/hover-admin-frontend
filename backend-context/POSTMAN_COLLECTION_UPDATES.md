# Postman Collection Update Summary

## Overview

The Postman collection has been updated to reflect the new multi-user role system with customer management and role-based access control.

## What's New

### 1. Collection Variables
Added new collection variables:
- **`customer_id`** - Stores the customer ID for testing customer-specific operations
- **`last_uploaded_image_key`** - Already existed, updated to work with new folder structure

### 2. New Section: Customer Management (Admin Only)

A complete new section with 5 endpoints for managing customers:

#### **Create Customer** (`POST /customers`)
- Creates a new customer profile
- Requires admin authentication
- Auto-saves `customer_id` to collection variable for subsequent requests
- Validates customer folder path in response

#### **List All Customers** (`GET /customers`)
- Lists all customer profiles
- Supports `limit` query parameter
- Validates customer array structure

#### **Get Customer by ID** (`GET /customers/{customer_id}`)
- Retrieves specific customer details
- Uses `{{customer_id}}` variable from collection

#### **Update Customer** (`PATCH /customers/{customer_id}`)
- Updates customer profile (name, phone, enabled status)
- All fields optional

#### **Disable Customer Account** (`PATCH /customers/{customer_id}`)
- Quick action to disable a customer account
- Validates `enabled: false` in response

### 3. Updated Image Management Section

Completely revamped with role-based endpoints:

#### Upload Operations (Admin Only)

1. **Upload Image to Customer Folder** (`POST /images/upload?customer_id={customer_id}`)
   - Uploads file to specific customer's folder
   - Validates file is stored in `customers/{customer_id}/` path
   - Auto-saves image key for cleanup

2. **Upload Image to General Folder** (`POST /images/upload`)
   - Uploads file to general folder accessible by all customers
   - Validates file is stored in `general/` path
   - Verifies `customer_id` is null

3. **Upload Image (Will Fail for Customer)** (`POST /images/upload`)
   - Test endpoint to verify customers cannot upload
   - Expects 403 Forbidden status
   - Validates error message

#### List Operations (Role-Based)

1. **List All Images (Admin View)** (`GET /images/list`)
   - Admin sees all files across all customers and general folder
   - Returns presigned URLs

2. **List Images (Customer View)** (`GET /images/list`)
   - Customer sees only their files + general files
   - Validates customer cannot see other customers' files

3. **List Images with Prefix (Admin)** (`GET /images/list?prefix=customers/{customer_id}/`)
   - Filter by customer or date folder
   - Admin only - prefix ignored for customers

4. **List General Folder Images** (`GET /images/list?prefix=general/`)
   - Shows only general folder files
   - All images validated to be in `general/` path

#### Delete Operations (Admin Only)

1. **Delete Image (Admin Only)** (`DELETE /images/{key}`)
   - Updated path structure for customer folders
   - Example: `customers/{customer_id}/2026/01/16/image.jpg`

2. **Delete Last Uploaded Image** (`DELETE /images/{last_uploaded_image_key}`)
   - Uses saved image key variable
   - Works with new folder structure

3. **Delete Image (Will Fail for Customer)** (`DELETE /images/{key}`)
   - Test endpoint to verify customers cannot delete
   - Expects 403 Forbidden status
   - Validates error message

## Testing Workflows

### Workflow 1: Complete Admin Flow

1. **Login** as admin → Save access token
2. **Create Customer** → Save customer_id
3. **Upload to Customer Folder** → Verify file path
4. **Upload to General Folder** → Verify file path
5. **List All Images** → See all files
6. **Get Customer Details** → Verify customer exists
7. **Delete Image** → Clean up

### Workflow 2: Customer Access Flow

1. **Login** as customer → Save access token
2. **List Images** → See only own files + general files
3. **Attempt Upload** → Expect 403 Forbidden
4. **Attempt Delete** → Expect 403 Forbidden

### Workflow 3: Customer Management

1. **Login** as admin
2. **List All Customers** → View existing customers
3. **Create Customer** → Add new customer
4. **Get Customer by ID** → View details
5. **Update Customer** → Modify profile
6. **Disable Customer** → Set enabled: false

## Test Scripts

All endpoints include comprehensive test scripts that:

✅ Verify HTTP status codes (200, 201, 403, 404, etc.)  
✅ Validate response structure  
✅ Check for required fields  
✅ Auto-save important values to collection variables  
✅ Validate role-based access control  
✅ Verify file organization (customer vs general folders)  
✅ Test error scenarios (customer upload/delete attempts)

## Updated Descriptions

All endpoint descriptions have been updated to:
- Clearly indicate **Admin Only** or **Role-Based** access
- Explain what each role can see/do
- Document the new folder structure (`customers/{id}/` and `general/`)
- Reference collection variables used
- Provide example file paths

## Collection Variables Usage

### Set Automatically by Tests

- **`access_token`** - Set by login requests
- **`id_token`** - Set by login requests
- **`refresh_token`** - Set by login requests
- **`customer_id`** - Set by "Create Customer" request
- **`last_uploaded_image_key`** - Set by upload requests

### Configure Manually

- **`base_url`** - Your API endpoint (default: https://api.samwylock.com)
- **`username`** - Your login username
- **`password`** - Your login password

## Breaking Changes from Previous Version

### Image Upload
- **Before**: `POST /images/upload` → files stored in `YYYY/MM/DD/`
- **After**: 
  - `POST /images/upload?customer_id={id}` → `customers/{id}/YYYY/MM/DD/`
  - `POST /images/upload` → `general/YYYY/MM/DD/`

### Image List
- **Before**: Returns all files for any authenticated user
- **After**: 
  - Admins see all files
  - Customers see only their files + general files

### Image Delete
- **Before**: Any authenticated user can delete
- **After**: Admin only (403 for customers)

## File Paths

### Customer Files
```
customers/{customer_id}/2026/01/16/photo_20260116_120000.jpg
```

### General Files
```
general/2026/01/16/shared_20260116_120000.jpg
```

## Import Instructions

1. Open Postman
2. Click **Import** button
3. Select **Hovver-Admin-Dashboard.postman_collection.json**
4. Collection appears in sidebar
5. Configure collection variables:
   - Set `base_url` to your API endpoint
   - Set `username` to admin email
   - Set `password` to admin password
6. Run "Login" request first to get access token
7. All subsequent requests use the token automatically

## Tips for Testing

### Admin Testing
1. Use admin credentials for login
2. Access token automatically used for all authenticated requests
3. Can test all endpoints

### Customer Testing
1. Create a customer using admin account
2. Note the temporary password
3. Create a new environment or temporarily change `username`/`password` variables
4. Login as customer
5. Test customer view (should see 403 on upload/delete)

### Switching Between Roles
- Keep two separate environments: "Admin" and "Customer"
- Or use different collection variables
- Or manually update `access_token` between different user logins

## Validation Points

Each test validates:
- ✅ Correct HTTP status codes
- ✅ Response structure matches models
- ✅ Required fields present
- ✅ Role-based access enforced (403 for unauthorized actions)
- ✅ File organization correct (customer vs general folders)
- ✅ Customer isolation (customers don't see other customers' files)
- ✅ Variables automatically saved for workflow continuity

## Next Steps

1. Import updated collection into Postman
2. Configure `base_url`, `username`, and `password` variables
3. Test admin workflows
4. Create test customer
5. Test customer workflows
6. Verify role-based access control works as expected

---

**Updated**: January 16, 2026  
**Version**: 2.0 (Multi-User Role System)  
**Compatible with**: API v2.0 with customer management

