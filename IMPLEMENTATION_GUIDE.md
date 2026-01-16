# Multi-User Role Frontend - Implementation Guide

## Quick Start

### Prerequisites
- Backend API running with multi-user role system enabled
- Admin user created in Cognito (with Admins group membership)
- Customer user created in Cognito (with Customers group membership)

### Setup Steps

1. **Install Dependencies** (if not already done)
```powershell
npm install
```

2. **Configure Environment Variables**
Create `.env.local` file:
```env
NEXT_PUBLIC_API_URL=https://your-api-url.com
```

3. **Run Development Server**
```powershell
npm run dev
```

4. **Access the Application**
- Open browser to `http://localhost:3000`
- Login with admin credentials to see full admin dashboard
- Login with customer credentials to see limited customer portal

## Testing Guide

### Manual Testing

#### Test as Admin User

1. **Login Flow**
   - Navigate to `/login`
   - Enter admin credentials
   - Verify redirect to gallery page
   - Check that "Admin" badge appears next to email in header
   - Verify navigation shows: Upload, Gallery, Customers, Account

2. **Customer Management**
   - Click "Customers" in navigation
   - Verify customer list loads
   - Search for a customer by name/email
   - Click "Add New Customer"
   - Fill form: email, name, phone, temporary password
   - Submit and verify redirect to customer detail page
   - Edit customer name or phone number
   - Toggle "Account Enabled" checkbox
   - Save changes and verify update

3. **File Upload**
   - Navigate to Upload page
   - Select "General Folder" radio button
   - Choose an image file
   - Upload and verify success message
   - Select "Customer Folder" radio button
   - Choose a customer from dropdown
   - Upload and verify success message mentions customer

4. **Gallery**
   - Navigate to Gallery page
   - Verify folder badges appear on images (blue for customer, green for general)
   - Use customer filter dropdown to filter by specific customer
   - Select "General Folder Only" option
   - Verify filtering works correctly
   - Click "View" to open image in new tab
   - Click "Delete" on an image, then "Confirm" to delete
   - Verify image is removed from gallery

#### Test as Customer User

1. **Login Flow**
   - Navigate to `/login`
   - Enter customer credentials
   - Verify redirect to gallery page
   - Check that "Customer" badge appears next to email in header
   - Verify navigation shows only: Gallery, Account (no Upload or Customers)

2. **Access Restrictions**
   - Try to navigate to `/upload` directly
   - Verify redirect to `/gallery`
   - Try to navigate to `/customers` directly
   - Verify redirect to `/gallery`

3. **Gallery**
   - Navigate to Gallery page
   - Verify only customer's files + general folder files are visible
   - Verify no folder badges shown (not admin)
   - Verify no "Delete" button on images
   - Click "View" to open image in new tab
   - Verify customer filter dropdown is not shown

4. **Account Page**
   - Navigate to Account page
   - Verify profile information displays
   - Test password change functionality

### Automated Testing Scenarios

Create tests for the following scenarios:

```typescript
// Example test structure (using Jest/React Testing Library)

describe('Admin User Flow', () => {
  test('should see admin badge and full navigation', () => {
    // Mock admin JWT token
    // Render protected layout
    // Assert "Admin" badge visible
    // Assert "Customers" link visible
    // Assert "Upload" link visible
  });

  test('should be able to create customer', () => {
    // Navigate to /customers/new
    // Fill form
    // Submit
    // Assert success message
  });

  test('should be able to filter gallery by customer', () => {
    // Navigate to /gallery
    // Select customer from dropdown
    // Assert filtered images displayed
  });
});

describe('Customer User Flow', () => {
  test('should see customer badge and limited navigation', () => {
    // Mock customer JWT token
    // Render protected layout
    // Assert "Customer" badge visible
    // Assert "Customers" link NOT visible
    // Assert "Upload" link NOT visible
  });

  test('should be redirected from upload page', () => {
    // Mock customer JWT token
    // Navigate to /upload
    // Assert redirect to /gallery
  });

  test('should only see own files in gallery', () => {
    // Mock customer JWT token with customer_id
    // Navigate to /gallery
    // Assert only customer + general files shown
    // Assert no delete buttons
  });
});
```

## Role-Based Features Matrix

| Feature | Admin | Customer |
|---------|-------|----------|
| View Gallery | ✅ All files | ✅ Own + General |
| Upload Files | ✅ To any folder | ❌ No access |
| Delete Files | ✅ Any file | ❌ No access |
| Manage Customers | ✅ Full access | ❌ No access |
| View Own Profile | ✅ | ✅ |
| Edit Own Profile | ✅ | ✅ |
| Filter Gallery by Customer | ✅ | ❌ |
| See Folder Badges | ✅ | ❌ |

## Troubleshooting

### Issue: "Admin" badge not showing after login

**Solution:**
- Check browser console for JWT decoding errors
- Verify access token is stored in localStorage
- Ensure user has `cognito:groups` claim with "Admins" in the JWT
- Clear localStorage and login again

### Issue: Customer can access upload page

**Solution:**
- Check that `isCustomer` is properly set in AuthContext
- Verify the upload page has the redirect logic at the top
- Clear browser cache and reload

### Issue: Gallery not filtering for customers

**Solution:**
- This is handled by the backend - verify backend is running correctly
- Check that JWT token includes `custom:customer_id` attribute
- Verify backend `/images/list` endpoint filters by customer ID

### Issue: Customer list shows "Loading customers..."

**Solution:**
- Check Network tab in DevTools for API errors
- Verify backend `/customers` endpoint is accessible
- Ensure admin JWT token is valid and includes "Admins" group
- Check CORS settings if API is on different domain

### Issue: Upload fails with 403 Forbidden

**Solution:**
- For admin uploads: Verify user is in Admins group
- For customer attempts: This is expected - customers cannot upload
- Check backend IAM permissions for ECS task role
- Verify Cognito user groups are properly assigned

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   Browser (Client)                       │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   JWT Utils  │  │   API Client │  │  Auth Context│  │
│  │              │  │              │  │              │  │
│  │ • parseJwt   │→ │ • customers  │→ │ • userRole   │  │
│  │ • getUserRole│  │ • uploadImage│  │ • isAdmin    │  │
│  │ • getCustomer│  │ • listImages │  │ • customerId │  │
│  │   Id         │  │              │  │              │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│         ↓                   ↓                  ↓         │
│  ┌──────────────────────────────────────────────────┐  │
│  │              Protected Layout                     │  │
│  │  • Role-based navigation                         │  │
│  │  • Role badge display                            │  │
│  └──────────────────────────────────────────────────┘  │
│         ↓                   ↓                  ↓         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │ Upload   │  │ Gallery  │  │Customers │  │Account │ │
│  │ (Admin)  │  │(Role-    │  │(Admin)   │  │(Both)  │ │
│  │          │  │ Based)   │  │          │  │        │ │
│  └──────────┘  └──────────┘  └──────────┘  └────────┘ │
│                                                           │
└─────────────────────────────────────────────────────────┘
                           ↓
                    HTTPS / Bearer Token
                           ↓
┌─────────────────────────────────────────────────────────┐
│                  Backend API (FastAPI)                   │
│  • Validates JWT tokens                                  │
│  • Checks cognito:groups for role                        │
│  • Filters S3 results by role                            │
│  • Enforces admin-only endpoints                         │
└─────────────────────────────────────────────────────────┘
```

## Code Organization

```
src/
├── lib/
│   ├── api.ts              # API client with all endpoints
│   └── jwt.ts              # JWT decoding utilities
├── contexts/
│   └── AuthContext.tsx     # Auth state + role management
├── components/
│   └── SessionTimeoutModal.tsx
└── app/
    ├── (protected)/
    │   ├── layout.tsx      # Role-based navigation
    │   ├── upload/
    │   │   └── page.tsx    # Admin-only upload
    │   ├── gallery/
    │   │   └── page.tsx    # Role-based gallery
    │   ├── customers/
    │   │   ├── page.tsx    # Customer list
    │   │   ├── new/
    │   │   │   └── page.tsx # Create customer
    │   │   └── [id]/
    │   │       └── page.tsx # Customer detail
    │   └── account/
    │       └── page.tsx    # Profile management
    ├── login/
    │   └── page.tsx        # Login page
    └── page.tsx            # Landing page
```

## Security Considerations

### Frontend Security
- ✅ JWT tokens stored in localStorage (consider httpOnly cookies for production)
- ✅ Role extracted from JWT claims (verified by backend)
- ✅ UI elements conditionally rendered based on role
- ✅ Protected routes redirect unauthorized users
- ✅ Token expiration handled with auto-logout

### Backend Security (Must be enforced)
- ✅ All endpoints validate JWT tokens
- ✅ Admin-only endpoints check `cognito:groups` claim
- ✅ Customer file access filtered by `custom:customer_id`
- ✅ S3 presigned URLs expire after 1 hour
- ✅ CORS configured for frontend domain only

### Important Notes
⚠️ **Frontend role checks are for UX only** - Real security is enforced by the backend. Never trust frontend-only validation.

⚠️ **JWT tokens in localStorage** - Consider using httpOnly cookies in production for better XSS protection.

⚠️ **Presigned URLs** - S3 presigned URLs bypass authentication once generated. Ensure they expire quickly (currently 1 hour).

## Deployment Checklist

- [ ] Set `NEXT_PUBLIC_API_URL` environment variable for production
- [ ] Build production bundle: `npm run build`
- [ ] Test production build locally: `npm start`
- [ ] Verify API endpoints are accessible from production domain
- [ ] Configure CORS on backend for production frontend URL
- [ ] Test admin login flow in production
- [ ] Test customer login flow in production
- [ ] Verify role-based features work in production
- [ ] Check browser console for errors
- [ ] Test on mobile devices
- [ ] Verify dark mode works correctly

## Support & Maintenance

### Monitoring

Monitor the following metrics:
- Failed login attempts
- 403 Forbidden errors (unauthorized access attempts)
- JWT decoding errors
- API timeout errors
- Customer creation success rate

### Updating Dependencies

When updating Next.js or React:
1. Test role-based navigation still works
2. Verify localStorage access works correctly
3. Test JWT decoding with new JavaScript engine
4. Ensure all protected routes redirect properly

### Adding New Features

When adding new features:
1. Determine if feature is admin-only, customer-only, or both
2. Add appropriate role checks in UI components
3. Ensure backend endpoints enforce role requirements
4. Update this documentation with new features
5. Add to testing checklist

