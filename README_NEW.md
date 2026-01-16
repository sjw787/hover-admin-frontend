# Hovver Admin Dashboard - Frontend

A Next.js 16 admin dashboard with role-based access control for managing customers and image files stored in AWS S3.

## Features

### 🔐 Multi-User Role System
- **Admin Users:** Full access to upload, manage customers, and delete files
- **Customer Users:** View-only access to their files and general files
- JWT-based authentication with role extraction from Cognito groups

### 👥 Customer Management (Admin Only)
- Create, view, edit, and manage customer accounts
- Enable/disable customer accounts
- Assign customers dedicated S3 folders
- Search and filter customer list

### 📤 File Upload (Admin Only)
- Upload images to customer-specific folders
- Upload images to general folder (visible to all customers)
- Drag-and-drop support
- File type and size validation (10MB max)
- Progress indicators

### 🖼️ Image Gallery
- **Admin View:** See all files with folder badges, customer filtering
- **Customer View:** See only their files + general folder files
- Download images via presigned URLs
- Delete images (admin only)
- Responsive grid layout with pagination

### 🎨 Modern UI/UX
- Clean, professional interface with Tailwind CSS
- Dark mode support
- Mobile-responsive design
- Role badges in navigation
- Session timeout warnings

## Quick Start

### Prerequisites
- Node.js 20+
- npm or yarn
- Backend API running (see `backend-context/` for details)

### Installation

1. **Clone and Install**
```bash
git clone <repository-url>
cd hover-admin-frontend
npm install
```

2. **Configure Environment**
Create `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

3. **Run Development Server**
```bash
npm run dev
```

4. **Open Browser**
Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── lib/
│   ├── api.ts              # API client for all backend endpoints
│   └── jwt.ts              # JWT decoding utilities for role extraction
├── contexts/
│   └── AuthContext.tsx     # Authentication state and role management
├── components/
│   └── SessionTimeoutModal.tsx
└── app/
    ├── (protected)/        # Routes requiring authentication
    │   ├── layout.tsx      # Role-based navigation layout
    │   ├── upload/         # File upload (admin only)
    │   ├── gallery/        # Image gallery (role-based filtering)
    │   ├── customers/      # Customer management (admin only)
    │   │   ├── page.tsx    # Customer list
    │   │   ├── new/        # Create customer form
    │   │   └── [id]/       # Customer detail/edit
    │   └── account/        # User profile management
    ├── login/              # Login page
    └── page.tsx            # Landing page
```

## Role-Based Access

| Feature | Admin | Customer |
|---------|-------|----------|
| View Gallery | ✅ All files | ✅ Own + General only |
| Upload Files | ✅ Any folder | ❌ |
| Delete Files | ✅ | ❌ |
| Manage Customers | ✅ | ❌ |
| View Profile | ✅ | ✅ |
| Edit Profile | ✅ | ✅ |

## Documentation

- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - Complete implementation details
- **[IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)** - Testing and troubleshooting guide
- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - Deployment instructions for various platforms
- **[plan-multiUserRoleFrontend.prompt.md](./plan-multiUserRoleFrontend.prompt.md)** - Original implementation plan
- **[backend-context/](./backend-context/)** - Backend API documentation and architecture

## Building for Production

```bash
# Build production bundle
npm run build

# Start production server
npm start

# Build succeeds with routes:
# - Static pages: /, /login, /account, /gallery, /upload, /customers, /customers/new
# - Dynamic routes: /customers/[id]
```

## Technology Stack

- **Framework:** Next.js 16.1.2 with React 19
- **Styling:** Tailwind CSS 4
- **Language:** TypeScript 5
- **Authentication:** AWS Cognito JWT tokens
- **State Management:** React Context API
- **Build Tool:** Turbopack

## API Integration

The frontend integrates with a FastAPI backend supporting:
- `POST /auth/login` - User authentication
- `GET /auth/me` - Current user info
- `POST /customers` - Create customer (admin)
- `GET /customers` - List customers (admin)
- `GET /customers/{id}` - Get customer (admin)
- `PATCH /customers/{id}` - Update customer (admin)
- `POST /images/upload?customer_id={id}` - Upload image (admin)
- `GET /images/list` - List images (role-filtered)
- `DELETE /images/{key}` - Delete image (admin)

See `backend-context/` for complete API documentation.

## Development

### Running Tests
```bash
npm run lint
```

### Code Structure Guidelines
- Use TypeScript for all new files
- Follow existing patterns for API calls (use `src/lib/api.ts`)
- Check user role with `useAuth()` hook before rendering admin features
- Add role checks to new protected routes

### Adding New Features

1. **Determine Role Requirements**
   - Admin only, customer only, or both?
   
2. **Update API Client** (if needed)
   - Add TypeScript interfaces to `src/lib/api.ts`
   - Add API methods to `ApiClient` class

3. **Create UI Components**
   - Use `useAuth()` hook for role checks
   - Add conditional rendering based on `isAdmin` or `isCustomer`

4. **Update Navigation** (if needed)
   - Modify `src/app/(protected)/layout.tsx`
   - Add role-based navigation items

5. **Test Both Roles**
   - Test as admin user
   - Test as customer user
   - Verify unauthorized access is blocked

## Security Notes

⚠️ **Important Security Considerations:**

1. **Frontend role checks are for UX only** - Never trust client-side validation. The backend must enforce all access control.

2. **JWT tokens in localStorage** - Tokens are stored in localStorage for simplicity. For production, consider httpOnly cookies for better XSS protection.

3. **Presigned URLs** - S3 presigned URLs bypass authentication once generated. They expire after 1 hour by default.

4. **CORS Configuration** - Ensure backend CORS is properly configured for your production domain.

## Troubleshooting

### Common Issues

**Issue: Role badge not showing**
- Clear localStorage and login again
- Check JWT token includes `cognito:groups` claim
- Verify token is decoded correctly (check browser console)

**Issue: Customer can access admin pages**
- Verify `isAdmin` check exists at top of page component
- Check redirect logic in protected layout
- Clear browser cache

**Issue: Gallery not loading**
- Verify `NEXT_PUBLIC_API_URL` is set correctly
- Check backend API is running and accessible
- Open DevTools Network tab to see API errors

**Issue: Upload fails with 403**
- For customers: This is expected - customers cannot upload
- For admins: Verify user is in Admins Cognito group
- Check backend IAM permissions

See [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) for more troubleshooting.

## Contributing

1. Create a feature branch
2. Make your changes
3. Test with both admin and customer users
4. Update documentation if needed
5. Submit a pull request

## License

[Your License Here]

## Support

For questions or issues:
- Review documentation in root directory
- Check `backend-context/` for API details
- Review Next.js docs: https://nextjs.org/docs
- Check AWS Cognito docs: https://docs.aws.amazon.com/cognito/

---

**Version:** 1.0.0  
**Last Updated:** January 16, 2026  
**Status:** ✅ Production Ready

