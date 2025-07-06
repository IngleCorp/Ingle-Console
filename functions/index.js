const functions = require('firebase-functions');
const admin = require('firebase-admin');
const {onRequest} = require("firebase-functions/v2/https");
const {logger} = require("firebase-functions");

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

// Create Firebase Auth user (for admin user creation)
exports.createUser = onRequest({cors: true}, async (req, res) => {
  try {
    // Check if the request is from an authenticated admin
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    try {
      // Verify the ID token and get user info
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      
      // Check if user has admin privileges (you can customize this check)
      const userDoc = await admin.firestore().collection('users').where('firebaseUid', '==', decodedToken.uid).get();
      
      if (userDoc.empty) {
        return res.status(403).json({ error: 'User not found in database' });
      }
      
      const userData = userDoc.docs[0].data();
      if (userData.role !== 'admin') {
        return res.status(403).json({ error: 'Insufficient permissions. Admin role required.' });
      }
      
    } catch (error) {
      logger.error('Token verification failed:', error);
      return res.status(401).json({ error: 'Invalid authentication token' });
    }

    // Extract user creation data from request
    const { email, password, displayName } = req.body;
    
    if (!email || !password || !displayName) {
      return res.status(400).json({ 
        error: 'Missing required fields: email, password, displayName' 
      });
    }

    // Create the user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: displayName,
      emailVerified: false
    });

    logger.info(`Successfully created user: ${userRecord.uid}`);
    
    // Return the user UID
    res.status(200).json({
      success: true,
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName
    });

  } catch (error) {
    logger.error('Error creating user:', error);
    
    // Handle specific Firebase Auth errors
    let errorMessage = 'Failed to create user';
    if (error.code === 'auth/email-already-exists') {
      errorMessage = 'Email already exists';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email address';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'Password is too weak';
    }
    
    res.status(400).json({
      error: errorMessage,
      code: error.code
    });
  }
});

// Delete Firebase Auth user (for admin user deletion)
exports.deleteUser = onRequest({cors: true}, async (req, res) => {
  try {
    // Check authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const userDoc = await admin.firestore().collection('users').where('firebaseUid', '==', decodedToken.uid).get();
      
      if (userDoc.empty) {
        return res.status(403).json({ error: 'User not found in database' });
      }
      
      const userData = userDoc.docs[0].data();
      if (userData.role !== 'admin') {
        return res.status(403).json({ error: 'Insufficient permissions. Admin role required.' });
      }
      
    } catch (error) {
      logger.error('Token verification failed:', error);
      return res.status(401).json({ error: 'Invalid authentication token' });
    }

    const { uid } = req.body;
    
    if (!uid) {
      return res.status(400).json({ error: 'Missing required field: uid' });
    }

    // Delete the user from Firebase Auth
    await admin.auth().deleteUser(uid);
    
    logger.info(`Successfully deleted user: ${uid}`);
    
    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting user:', error);
    
    let errorMessage = 'Failed to delete user';
    if (error.code === 'auth/user-not-found') {
      errorMessage = 'User not found';
    }
    
    res.status(400).json({
      error: errorMessage,
      code: error.code
    });
  }
}); 