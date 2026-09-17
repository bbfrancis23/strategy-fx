import mongoose from 'mongoose'

/**
 * Runs `work` inside a MongoDB transaction: starts a session, commits on
 * success, and aborts + rethrows on failure.
 *
 * Centralizes the session lifecycle (start/commit/abort/endSession) that
 * was previously duplicated near-verbatim across several mongo/controls
 * functions (deleteComment.ts, createComment.ts, deleteCheckbox.ts,
 * patchBoardCols.js), so a fix to the pattern itself — like guarding
 * abortTransaction() with inTransaction(), since calling it on an
 * already-committed session throws — only has to be made once instead of
 * needing to be repeated (and kept in sync) at every call site.
 *
 * `work` receives the session and is expected to pass it as the `session`
 * option to every operation it performs, and to run those operations
 * sequentially (not concurrently, e.g. via Promise.all) — a single
 * ClientSession is not safe to use for more than one in-flight operation
 * at a time.
 */
export const runInTransaction = async (
  work: (dbSession: mongoose.ClientSession) => Promise<void>
): Promise<void> => {
  // Created outside the try/finally: if startSession() itself throws,
  // there's nothing to clean up, so it's fine for that to propagate
  // directly to the caller.
  const dbSession = await mongoose.startSession()

  try {
    dbSession.startTransaction()
    await work(dbSession)
    await dbSession.commitTransaction()
  } catch (e) {
    // inTransaction() guards against calling abortTransaction() on an
    // already-committed session, which throws.
    if (dbSession.inTransaction()) {
      await dbSession.abortTransaction()
    }
    throw e
  } finally {
    // In `finally`, not as the last statement of the try/catch: if this
    // lived only at the end of the try block, a failure partway through
    // (or in abortTransaction() itself) would skip it entirely, leaking
    // the session — and since abortTransaction() failing would also
    // replace the original error with its own, `finally` is what
    // guarantees cleanup runs regardless of which path was taken.
    dbSession.endSession()
  }
}
