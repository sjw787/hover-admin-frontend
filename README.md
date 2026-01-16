# Hovver Admin Dashboard

A Next.js 16 admin dashboard for managing images with AWS Cognito authentication and S3 storage.

## Features

- 🔐 **Secure Authentication** - Login with AWS Cognito
- 📤 **Image Upload** - Upload images with preview (JPG, PNG, GIF, WebP, max 10MB)
- 🖼️ **Image Gallery** - View all uploaded images with pagination
- 🔍 **Filter by Prefix** - Filter images by date folder (e.g., `2026/01/`)
- 🗑️ **Delete Images** - Remove images with confirmation
- 🌓 **Dark Mode** - Automatic dark mode support
- 📱 **Responsive Design** - Works on all devices
- ☁️ **AWS S3 + CloudFront** - Static hosting with global CDN

## Quick Deploy to AWS

**Deploy in 5 minutes:**
```bash
cd terraform
terraform init
terraform apply
# Type 'yes', then run deployment script
```

See [QUICKSTART.md](QUICKSTART.md) for details or [DEPLOYMENT.md](DEPLOYMENT.md) for full guide.

## Prerequisites

- Node.js 20+ installed
- Backend API running at `http://localhost:8000`
- Valid AWS Cognito credentials
- (For deployment) AWS CLI and Terraform installed

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   
   The `.env.local` file is already created with:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```
   
   Update this if your backend API is hosted elsewhere.

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

### Login

1. Navigate to the login page (automatically redirected if not authenticated)
2. Enter your AWS Cognito credentials:
   - Username/Email: `admin@example.com`
   - Password: Your password
3. Click "Sign In"

### Upload Images

1. Click "Upload" in the navigation header
2. Select an image file (JPG, PNG, GIF, or WebP, max 10MB)
3. Preview the image before uploading
4. Click "Upload Image"
5. Wait for the upload to complete

### View Gallery

1. Click "Gallery" in the navigation header
2. Browse all uploaded images in a grid layout
3. Use pagination to navigate through multiple pages
4. Filter images by prefix (e.g., `2026/01/15/` for a specific date)
5. Click "View" to open the image in a new tab
6. Click "Delete" twice to confirm deletion

### Logout

Click the "Logout" button in the top-right corner to sign out and return to the login page.

## Project Structure

```
src/
├── app/
│   ├── (protected)/          # Protected routes requiring authentication
│   │   ├── gallery/          # Gallery page
│   │   ├── upload/           # Upload page
│   │   └── layout.tsx        # Protected layout with navigation
│   ├── login/                # Login page
│   ├── layout.tsx            # Root layout with AuthProvider
│   ├── page.tsx              # Home page (redirects)
│   └── globals.css           # Global styles
├── contexts/
│   └── AuthContext.tsx       # Authentication context provider
└── lib/
    └── api.ts                # API client for backend communication

middleware.ts                 # Next.js middleware for route protection
```

## API Endpoints

The application connects to the following backend endpoints:

- `POST /auth/login` - Authenticate user
- `GET /auth/me` - Get current user info
- `POST /images/upload` - Upload an image
- `GET /images/list?prefix=` - List images (with optional prefix filter)
- `DELETE /images/{key}` - Delete an image

## Technologies

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS 4** - Styling
- **React 19** - UI library

## Development

### Build for production:
```bash
npm run build
```

### Start production server:
```bash
npm start
```

### Run linter:
```bash
npm run lint
```

## Deployment to AWS

### Using Terraform (S3 + CloudFront)

This project includes complete Terraform configuration for deploying to AWS.

**Quick deploy:**
```bash
cd terraform
terraform init && terraform apply
```

**Deploy application updates:**
```bash
# Windows
.\terraform\deploy.ps1

# Linux/Mac
./terraform/deploy.sh
```

**Resources created:**
- S3 bucket for static hosting (private)
- CloudFront distribution for global CDN
- CloudFront Origin Access Identity
- Optional: Route53 DNS record for custom domain

**Cost:** ~$1.50-6/month for low traffic

See documentation:
- [QUICKSTART.md](QUICKSTART.md) - 5-minute quick start
- [DEPLOYMENT.md](DEPLOYMENT.md) - Comprehensive deployment guide
- [terraform/README.md](terraform/README.md) - Terraform details

## Security

- JWT tokens are stored in localStorage
- Access token is sent with every authenticated request
- Protected routes redirect to login if not authenticated
- All API requests use bearer token authentication

## Notes

- Images are stored with date-based organization (YYYY/MM/DD)
- Presigned S3 URLs are valid for 1 hour
- Image previews are generated client-side before upload
- The gallery supports pagination with 12 images per page
- Delete confirmation requires clicking "Delete" twice

## Troubleshooting

### "Failed to fetch" errors
- Ensure the backend API is running at `http://localhost:8000`
- Check CORS settings on the backend

### Authentication errors
- Verify your AWS Cognito credentials
- Check if tokens have expired (logout and login again)

### Upload errors
- Ensure file is under 10MB
- Check file format (JPG, PNG, GIF, WebP only)
- Verify you're authenticated

## License

MIT

