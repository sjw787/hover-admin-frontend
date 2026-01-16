# Plan: Multi-User Role Frontend Integration

The backend now supports two distinct user types (Admins and Customers) with role-based access control. The frontend needs to decode JWT tokens to extract user roles, conditionally show UI elements based on permissions, add customer management pages for admins, and update image upload/gallery flows to support customer-specific folders and the general folder structure.

## Steps

1. **Extend `api.ts` with customer management and role-based methods** in `src/lib/api.ts`: Add TypeScript interfaces for `CustomerProfile`, `CreateCustomerRequest`, `UpdateCustomerRequest`, `CustomerListResponse`, and methods `createCustomer()`, `listCustomers()`, `getCustomer()`, `updateCustomer()`, plus update `uploadImage()` to accept optional `customer_id` parameter for admin uploads.

2. **Add JWT decoding utility to extract user role and customer_id** in new `src/lib/jwt.ts`: Create `parseJwt()` function to decode access token, `getUserRole()` to extract `cognito:groups` claim (returns "admin" or "customer"), and `getCustomerId()` to extract `custom:customer_id` attribute from token claims.

3. **Enhance `AuthContext` with role awareness** in `src/contexts/AuthContext.tsx`: Extend `User` interface to include `role` and `customerId` fields, decode these values from access token after login and on load, expose `isAdmin` and `isCustomer` boolean flags in context value for easy consumption.

4. **Create customer management pages for admins** in new `src/app/(protected)/customers` directory: Build `page.tsx` for listing all customers with search/filter, create `[id]/page.tsx` for viewing/editing customer details, add `new/page.tsx` form for creating customers with email, name, phone, temporary password fields.

5. **Update upload page with customer selection for admins** in `src/app/(protected)/upload/page.tsx`: Add customer dropdown that fetches from `/customers` endpoint (admin-only), include radio buttons to choose between customer folder or general folder, pass `customer_id` query parameter to upload API when customer selected, hide upload functionality entirely for customer users.

6. **Enhance gallery with role-based filtering and folder organization** in `src/app/(protected)/gallery/page.tsx`: For admins, add customer filter dropdown to view specific customer folders or all files, display folder badges (customers/ID or general/) on image cards, for customers, automatically filter to show only their files plus general folder (backend handles this), update delete button to show only for admins.

7. **Update navigation with role-based menu items** in `src/app/(protected)/layout.tsx`: Add "Customers" navigation link visible only to admins using `isAdmin` flag, display user role badge (Admin/Customer) next to email in header, conditionally hide Upload link for customer users since they cannot upload.

8. **Error handling for 403 responses** in `src/lib/api.ts` and global error boundary: Show user-friendly messages when customers attempt admin-only actions, log out users or redirect to safe pages if unauthorized access detected.

9. **Customer portal branding** in `src/app/(protected)/layout.tsx` and global styles: Apply different color scheme or layout tweaks when `isCustomer` is true to visually distinguish customer experience from admin dashboard.

10. **Customer self-service** in `src/app/(protected)/profile/page.tsx`: Allow customers to view and update their own profile information (name, phone number) using existing update customer API endpoint.

11. **File upload metadata** in `src/lib/api.ts` and upload logic: Ensure uploaded files include metadata such as customer name, upload timestamp, and original filename for better tracking in gallery view.

12. **Image organization in gallery** in `src/app/(protected)/gallery/page.tsx`: Group images by customer with expandable sections for admins.

13. **Pagination for customer list** in `src/app/(protected)/customers/page.tsx`: Implement pagination UI if customer count exceeds a certain threshold (e.g., 50 per page).

14. **Customer account status indicators** in `src/app/(protected)/customers/page.tsx`: Show visual badges for enabled/disabled customer accounts in the customer list.
