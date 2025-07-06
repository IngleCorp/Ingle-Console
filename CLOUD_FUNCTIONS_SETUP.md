# Firebase Cloud Functions Setup for User Deletion

This guide explains how to set up and deploy Firebase Cloud Functions that enable complete user deletion (both Firestore and Firebase Auth).

## Prerequisites

1. Firebase CLI installed: `npm install -g firebase-tools`
2. Firebase project initialized
3. Firebase Admin SDK enabled in your project

## Setup Instructionsss

### 1. Initialize Firebase Functions (if not already done)

```bash
firebase init functions
```

Choose:
- Use an existing project (select your project)
- JavaScript (or TypeScript if preferred)
- Install dependencies with npm

### 2. Install Dependencies

Navigate to the functions directory and install required packages:

```bash
cd functions
npm install firebase-admin firebase-functions
```

### 3. Configure Firebase Admin SDK

Make sure your `functions/index.js` file includes the provided Cloud Functions code.

### 4. Deploy the Functions

```bash
# Deploy all functions
firebase deploy --only functions

# Or deploy specific function
firebase deploy --only functions:deleteUserFromAuth
```

### 5. Set up Security Rules (Important!)

Make sure your Firestore security rules allow admins to access user data:

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection - admins can read/write
    match /users/{userId} {
      allow read, write: if request.auth != null && 
        exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Activities collection - admins can read/write
    match /activities/{activityId} {
      allow read, write: if request.auth != null && 
        exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

## Available Cloud Functions

### 1. `deleteUserFromAuth`

**Purpose**: Deletes a single user from Firebase Auth

**Parameters**:
- `uid` (string): Firebase Auth UID of the user to delete

**Usage from client**:
```typescript
const deleteUserFunction = this.functions.httpsCallable('deleteUserFromAuth');
const result = await deleteUserFunction({ uid: 'user-firebase-uid' }).toPromise();
```

**Security**:
- Only authenticated admin users can call this function
- Users cannot delete themselves
- Validates user permissions before deletion

### 2. `bulkDeleteUsersFromAuth`

**Purpose**: Deletes multiple users from Firebase Auth in batches

**Parameters**:
- `uids` (string[]): Array of Firebase Auth UIDs to delete

**Usage from client**:
```typescript
const bulkDeleteFunction = this.functions.httpsCallable('bulkDeleteUsersFromAuth');
const result = await bulkDeleteFunction({ uids: ['uid1', 'uid2', 'uid3'] }).toPromise();
```

## How User Deletion Works

1. **Client-side (Angular)**:
   - Admin clicks delete button
   - User is deleted from Firestore first
   - If user has `firebaseUid`, Cloud Function is called
   - Activity log is created
   - Success/error notifications are shown

2. **Server-side (Cloud Function)**:
   - Validates admin permissions
   - Deletes user from Firebase Auth using Admin SDK
   - Creates activity log entry
   - Returns success/error response

## Error Handling

The system handles various error scenarios:

- **Permission denied**: Only admins can delete users
- **User not found**: Graceful handling if user doesn't exist
- **Network errors**: Proper error messages and logging
- **Self-deletion prevention**: Users cannot delete themselves

## Testing

### Local Testing

1. Start the Firebase emulator:
```bash
firebase emulators:start --only functions,firestore
```

2. Update your Angular environment to point to local emulators:
```typescript
// In your environment file
export const environment = {
  useEmulators: true,
  // ... other config
};
```

3. Configure emulators in your app module:
```typescript
// In app.module.ts
if (environment.useEmulators) {
  connectFunctionsEmulator(getFunctions(), 'localhost', 5001);
  connectFirestoreEmulator(getFirestore(), 'localhost', 8080);
}
```

### Production Testing

1. Deploy functions to staging environment first
2. Test with non-critical user accounts
3. Verify both Firestore and Auth deletion
4. Check activity logs are created properly

## Security Considerations

1. **Admin Verification**: Functions verify the calling user is an admin
2. **Permission Checks**: Double-check permissions in both client and server
3. **Audit Trail**: All deletions are logged in activities collection
4. **Self-Protection**: Admins cannot delete their own accounts
5. **Rate Limiting**: Consider implementing rate limiting for bulk operations

## Troubleshooting

### Common Issues

1. **"Permission denied" errors**:
   - Check Firestore security rules
   - Verify user has admin role
   - Ensure user document exists in Firestore

2. **"Function not found" errors**:
   - Verify functions are deployed: `firebase functions:list`
   - Check function names match exactly

3. **"unauthenticated" errors**:
   - Ensure user is logged in
   - Check Firebase Auth configuration

### Monitoring

Monitor Cloud Functions in Firebase Console:
- Functions usage and performance
- Error rates and logs
- Billing and quotas

## Cost Considerations

- Cloud Functions have usage-based pricing
- Monitor function invocations and execution time
- Consider implementing caching for frequent operations
- Use batch operations for multiple deletions

## Next Steps

1. Deploy the Cloud Functions
2. Test user deletion functionality
3. Monitor logs and performance
4. Consider adding additional admin functions as needed

For more information, see the [Firebase Functions documentation](https://firebase.google.com/docs/functions). 