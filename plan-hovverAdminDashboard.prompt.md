# Plan: Hovver Admin Dashboard Frontend with Authentication and Image Management

Build a Next.js 16 dashboard with protected routes for authenticated users to upload and view images. The app will use the backend API (localhost:8000) with AWS Cognito authentication, featuring a login page, file upload interface, image gallery, and persistent authentication using JWT tokens.

## Steps

1. **Create authentication infrastructure** including login page at [src/app/login/page.tsx](src/app/login/page.tsx), auth context provider in [src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx) for managing tokens (access_token, id_token, refresh_token) and user state, and API client utility in [src/lib/api.ts](src/lib/api.ts) for HTTP requests with bearer token authentication

2. **Implement route protection** by creating middleware in [middleware.ts](middleware.ts) to redirect unauthenticated users to `/login` and authenticated users away from login page, plus a protected layout wrapper in [src/app/(protected)/layout.tsx](src/app/(protected)/layout.tsx) with navigation header containing links to Upload and Gallery pages

3. **Build upload page** at [src/app/(protected)/upload/page.tsx](src/app/(protected)/upload/page.tsx) with file input accepting images (JPG, PNG, GIF, WebP, max 10MB), upload progress indicator, success/error messaging, and POST to `/images/upload` endpoint with multipart/form-data

4. **Build gallery page** at [src/app/(protected)/gallery/page.tsx](src/app/(protected)/gallery/page.tsx) that fetches from `/images/list` endpoint, displays images in a responsive grid with presigned URLs, shows metadata (size, last_modified), includes optional prefix filtering by date, and DELETE functionality per image with confirmation

5. **Configure environment and dependencies** by adding `.env.local` file with `NEXT_PUBLIC_API_URL=http://localhost:8000`, updating [next.config.ts](next.config.ts) to allow S3 image domains for presigned URLs, and installing any required dependencies (none needed beyond current setup)

6. Image preview should be displayed before upload for better user experience.

7. Use pagination or infinite scroll in the gallery if many images exist.

8. Errors should be handled gracefully with user-friendly messages.

9. Use loading states and skeletons for better perceived performance.

10. Ensure responsive design for usability on various devices.

