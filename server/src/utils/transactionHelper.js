const mongoose = require('mongoose');

/**
 * Runs a transactional operation with automatic retry on TransientTransactionError (e.g. WriteConflict)
 */
async function withTransactionRetry(fn, maxRetries = 5) {
  let attempt = 0;
  while (attempt < maxRetries) {
    attempt++;
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const result = await fn(session);
      await session.commitTransaction();
      session.endSession();
      return result;
    } catch (err) {
      await session.abortTransaction();
      session.endSession();

      const hasTransientLabel = err && err.hasErrorLabel && err.hasErrorLabel('TransientTransactionError');
      const isWriteConflict = err && (err.code === 112 || err.codeName === 'WriteConflict' || err.message?.includes('WriteConflict'));

      if ((hasTransientLabel || isWriteConflict) && attempt < maxRetries) {
        // Jittered backoff before retry
        await new Promise(res => setTimeout(res, 20 * attempt + Math.floor(Math.random() * 20)));
        continue;
      }
      throw err;
    }
  }
}

module.exports = {
  withTransactionRetry
};

