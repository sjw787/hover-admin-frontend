# Account Management & Password Reset Features

## Overview

The application now includes comprehensive account management and password reset features integrated with the backend APIs.

## New Features

### 1. Account Management Page (`/account`)

Accessible from the top navigation bar, allows users to:

#### **Profile Management Tab**
- Update full name
- Update phone number (with international format)
- Real-time validation and feedback

#### **Change Password Tab**
- Enter current password
- Set new password (with strength requirements)
- Confirm new password
- Automatic validation

**Password Requirements:**
- Minimum 8 characters
- Must include uppercase letter
- Must include lowercase letter
- Must include number
- Must include special character

---

### 2. Forgot Password Flow

Complete two-step password reset process:

#### **Step 1: Request Verification Code** (`/forgot-password`)
- User enters their username/email
- System sends verification code to registered email
- Accessible from login page via "Forgot your password?" link

#### **Step 2: Reset Password**
- Enter verification code from email
- Set new password
- Confirm new password
- Automatic redirect to login after success

---

### 3. New User Password Setup (`/new-password-required`)

Automatic flow for newly created users with temporary passwords:

#### **Automatic Detection**
- When login fails with "New password required" error
- User is automatically redirected to password setup page
- Username is pre-filled from login attempt

#### **Password Setup Process**
- Enter username (pre-filled)
- Enter temporary password (from admin/email)
- Set new permanent password
- Confirm new password
- Automatic redirect to login after success

**Use Case:** When an administrator creates a new user account with a temporary password, the user must set a permanent password on first login.

---

## API Integration

### New Backend Endpoints Used

Based on the Postman collection:

1. **Change Password**
   - `POST /auth/change-password`
   - Requires authentication
   - Body: `{ old_password, new_password }`

2. **Update Profile**
   - `PUT /auth/profile`
   - Requires authentication
   - Body: `{ name?, phone_number? }`

3. **Forgot Password**
   - `POST /auth/forgot-password`
   - Public endpoint
   - Body: `{ username }`

4. **Reset Password**
   - `POST /auth/reset-password`
   - Public endpoint
   - Body: `{ username, confirmation_code, new_password }`

5. **Complete New Password** (New User Setup)
   - `POST /auth/complete-new-password`
   - Public endpoint
   - Body: `{ username, temporary_password, new_password }`
   - Used when new user logs in for first time with temporary password

---

## User Interface

### Account Page

```
┌─────────────────────────────────────┐
│  Account Settings                   │
│  Manage your profile and security   │
├─────────────────────────────────────┤
│ [Profile Information] [Change Pass] │
├─────────────────────────────────────┤
│                                     │
│  Full Name:     [____________]      │
│  Phone Number:  [____________]      │
│                                     │
│              [Update Profile]       │
│                                     │
└─────────────────────────────────────┘
```

### Forgot Password Page

```
┌─────────────────────────────────────┐
│  Forgot Password                    │
│  Enter your email to receive code   │
├─────────────────────────────────────┤
│                                     │
│  Username/Email: [____________]     │
│                                     │
│      [Send Verification Code]       │
│                                     │
│         Back to Login               │
│                                     │
└─────────────────────────────────────┘
```

---

## Navigation

The Account page is accessible via:

1. **Top Navigation Bar**: New "Account" link between "Gallery" and logout
2. **URL**: Direct access at `/account`
3. **Protected Route**: Requires authentication

The Forgot Password page is accessible via:

1. **Login Page**: "Forgot your password?" link below the sign-in button
2. **URL**: Direct access at `/forgot-password`
3. **Public Route**: No authentication required

---

## Features & UX

### Success/Error Messaging
- Green success messages for completed actions
- Red error messages for failures
- Automatic message clearing between actions

### Form Validation
- Required field validation
- Password matching validation
- Real-time feedback
- Disabled states during submission

### Loading States
- Button text changes to "Updating...", "Changing...", etc.
- Disabled form fields during submission
- Spinner animations where appropriate

### Responsive Design
- Mobile-friendly layouts
- Touch-optimized buttons
- Accessible form controls

---

## Security Features

1. **Authentication Required**
   - Account management requires valid session
   - Automatic redirect to login if unauthenticated

2. **Password Validation**
   - Client-side matching validation
   - Server-side strength enforcement
   - Current password verification for changes

3. **Verification Codes**
   - Time-limited codes sent to email
   - One-time use
   - Secure delivery via AWS Cognito

---

## Error Handling

### Common Scenarios

**Change Password Errors:**
- Wrong current password → "Current password is incorrect"
- Weak new password → "Password does not meet requirements"
- Network errors → "Request timeout - please check your connection"

**Profile Update Errors:**
- Invalid phone format → "Phone number must be in format +[country code][number]"
- Unauthorized → Automatic redirect to login

**Forgot Password Errors:**
- User not found → "User not found"
- Invalid code → "Invalid verification code"
- Expired code → "Verification code has expired"

---

## Testing

### Account Management

1. **Login** to the application
2. **Click "Account"** in navigation
3. **Profile Tab:**
   - Enter name: "John Doe"
   - Enter phone: "+1234567890"
   - Click "Update Profile"
   - ✓ Should show success message

4. **Password Tab:**
   - Enter current password
   - Enter new password (meeting requirements)
   - Confirm new password
   - Click "Change Password"
   - ✓ Should show success message

### Forgot Password

1. **From login page**, click "Forgot your password?"
2. **Enter username/email**
3. **Click "Send Verification Code"**
4. ✓ Should show success and move to step 2
5. **Check email** for verification code
6. **Enter code** and new password
7. **Click "Reset Password"**
8. ✓ Should show success and redirect to login
9. **Login with new password**
10. ✓ Should successfully login

---

## Backend CORS Configuration

Ensure backend allows these endpoints for `https://admin.samwylock.com`:

```python
# FastAPI example
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://admin.samwylock.com",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Files Modified/Created

### New Files
- `src/app/(protected)/account/page.tsx` - Account management page
- `src/app/forgot-password/page.tsx` - Forgot password flow
- `src/app/new-password-required/page.tsx` - New user password setup
- `ACCOUNT-FEATURES.md` - This documentation

### Modified Files
- `src/lib/api.ts` - Added API methods for new endpoints
- `src/app/login/page.tsx` - Added "Forgot password" link and new password detection
- `src/app/(protected)/layout.tsx` - Added "Account" navigation link

---

## Future Enhancements

Potential improvements:

- [ ] Email verification for profile updates
- [ ] Two-factor authentication setup
- [ ] Account deletion option
- [ ] Activity log viewer
- [ ] Profile picture upload
- [ ] Notification preferences
- [ ] API key management

---

## Troubleshooting

### Account page not accessible
**Check:** User is logged in and has valid session

### Password change fails
**Check:** 
- Current password is correct
- New password meets requirements
- Backend is accessible

### Verification code not received
**Check:**
- Email address is correct in Cognito
- Check spam folder
- Ensure backend email service is configured

### CORS errors
**Check:** Backend CORS configuration includes frontend domain

---

## Summary

✅ **Account Management** - Complete profile and password management
✅ **Forgot Password** - Self-service password reset
✅ **Navigation** - Integrated into main app navigation
✅ **Security** - Protected routes and validation
✅ **UX** - Clear feedback and error handling
✅ **Backend Integration** - All Postman APIs implemented

The features are now live and accessible at `https://admin.samwylock.com`!

