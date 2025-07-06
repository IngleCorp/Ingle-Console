const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
admin.initializeApp();

/**
 * Cloud Function to delete a user from Firebase Auth
 * This function uses the Firebase Admin SDK which allows deletion of other users
 * 
 * Usage: Call this function from your client with the user's UID
 * 
 * @param {string} uid - The Firebase Auth UID of the user to delete
 * @returns {Promise} - Success/error response
 */
exports.deleteUserFromAuth = functions.https.onCall(async (data, context) => {
  try {
    // Check if the request is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    // Check if the calling user is an admin
    const callingUserDoc = await admin.firestore()
      .collection('users')
      .doc(context.auth.uid)
      .get();
    
    if (!callingUserDoc.exists) {
      throw new functions.https.HttpsError('permission-denied', 'User profile not found');
    }

    const callingUser = callingUserDoc.data();
    if (callingUser.role !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Only admins can delete users');
    }

    // Get the UID of the user to delete
    const { uid } = data;
    
    if (!uid) {
      throw new functions.https.HttpsError('invalid-argument', 'User UID is required');
    }

    // Prevent admin from deleting themselves
    if (uid === context.auth.uid) {
      throw new functions.https.HttpsError('invalid-argument', 'Cannot delete your own account');
    }

    // Delete the user from Firebase Auth
    await admin.auth().deleteUser(uid);

    // Log the deletion activity
    await admin.firestore().collection('activities').add({
      type: 'user',
      action: 'Firebase Auth Deleted',
      entityId: uid,
      entityName: 'Firebase Auth User',
      details: `Firebase Auth user with UID ${uid} was deleted by admin`,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: context.auth.uid,
      createdByName: callingUser.name || context.auth.token.name || 'Admin',
      icon: 'delete',
      metadata: {
        deletedUid: uid,
        deletionMethod: 'server-side'
      }
    });

    return { 
      success: true, 
      message: 'User successfully deleted from Firebase Auth',
      uid: uid 
    };

  } catch (error) {
    console.error('Error deleting user from Firebase Auth:', error);
    
    // Handle specific Firebase Auth errors
    if (error.code === 'auth/user-not-found') {
      throw new functions.https.HttpsError('not-found', 'User not found in Firebase Auth');
    } else if (error.code === 'auth/invalid-uid') {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid user UID provided');
    }
    
    // Re-throw HttpsError instances
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    // Generic error
    throw new functions.https.HttpsError('internal', 'Failed to delete user from Firebase Auth');
  }
});

/**
 * Cloud Function to bulk delete users from Firebase Auth
 * Useful for cleanup operations
 * 
 * @param {string[]} uids - Array of Firebase Auth UIDs to delete
 * @returns {Promise} - Success/error response with deletion results
 */
exports.bulkDeleteUsersFromAuth = functions.https.onCall(async (data, context) => {
  try {
    // Check if the request is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    // Check if the calling user is an admin
    const callingUserDoc = await admin.firestore()
      .collection('users')
      .doc(context.auth.uid)
      .get();
    
    if (!callingUserDoc.exists) {
      throw new functions.https.HttpsError('permission-denied', 'User profile not found');
    }

    const callingUser = callingUserDoc.data();
    if (callingUser.role !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Only admins can delete users');
    }

    // Get the UIDs array
    const { uids } = data;
    
    if (!uids || !Array.isArray(uids) || uids.length === 0) {
      throw new functions.https.HttpsError('invalid-argument', 'UIDs array is required');
    }

    // Prevent admin from deleting themselves
    if (uids.includes(context.auth.uid)) {
      throw new functions.https.HttpsError('invalid-argument', 'Cannot delete your own account');
    }

    // Delete users in batches (Firebase Auth allows up to 1000 users per batch)
    const batchSize = 1000;
    const results = [];
    
    for (let i = 0; i < uids.length; i += batchSize) {
      const batch = uids.slice(i, i + batchSize);
      const deleteResult = await admin.auth().deleteUsers(batch);
      results.push(deleteResult);
    }

    // Log the bulk deletion activity
    await admin.firestore().collection('activities').add({
      type: 'user',
      action: 'Bulk Firebase Auth Deleted',
      entityId: 'bulk-operation',
      entityName: 'Multiple Firebase Auth Users',
      details: `Bulk deletion of ${uids.length} Firebase Auth users performed by admin`,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: context.auth.uid,
      createdByName: callingUser.name || context.auth.token.name || 'Admin',
      icon: 'delete',
      metadata: {
        deletedUids: uids,
        deletionMethod: 'server-side-bulk',
        batchResults: results
      }
    });

    return { 
      success: true, 
      message: `Bulk deletion completed for ${uids.length} users`,
      results: results
    };

  } catch (error) {
    console.error('Error bulk deleting users from Firebase Auth:', error);
    
    // Re-throw HttpsError instances
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    // Generic error
    throw new functions.https.HttpsError('internal', 'Failed to bulk delete users from Firebase Auth');
  }
}); 