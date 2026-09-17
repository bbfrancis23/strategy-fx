import db from '@/mongo/db'
import {getServerSession} from 'next-auth/next'
import {authOptions} from '@/pages/api/auth/[...nextauth]'

import Project from '@/mongo/schemas/ProjectSchema'
import Board from '@/mongo/schemas/BoardSchema'

import Column from '@/mongo/schemas/ColumnSchema'
import {runInTransaction} from '@/mongo/controls/runInTransaction'

import axios from 'axios'

export const patchBoardCols = async (req, res) => {
  const {projectId, boardId} = req.query
  let status = axios.HttpStatusCode.Ok
  let message = ''
  let board = undefined

  const authSession = await getServerSession(req, res, authOptions)
  await db.connect()

  if (authSession) {
    const project = await Project.findById(projectId)

    if (project) {
      if (project.leader._id.toString() === authSession.user.id) {
        board = await Board.findById(boardId)

        if (!board) {
          status = axios.HttpStatusCode.NotFound
          message = 'Board not found'
        } else if (board.project.toString() === projectId) {
          const boardCols = req.body.boardCols
          const requestedColumnIds = Object.keys(boardCols)

          // requestedColumnIds are otherwise trusted independently of the
          // board they're claimed to belong to — without this, a project
          // leader could pass their own real projectId/boardId (passing
          // the check above) alongside column ids belonging to an
          // unrelated board/project and overwrite their items. Same class
          // of gap fixed in deleteComment.ts (#421) and deleteCheckbox.ts
          // (#422).
          const boardColumnIds = board.columns.map((id) => id.toString())
          const hasUnrelatedColumn = requestedColumnIds.some(
            (key) => !boardColumnIds.includes(key)
          )

          if (hasUnrelatedColumn) {
            status = axios.HttpStatusCode.Forbidden
            message = 'One or more columns do not belong to this board'
          } else {
            // Same idea, one level deeper: the column keys are now
            // verified to belong to this board, but boardCols[key].items
            // is still a client-supplied list of item ids with no check
            // that any of them actually belong to this board. Without
            // this, a leader could submit an otherwise-legitimate column
            // update whose items list includes an id belonging to a
            // completely different project — silently attaching (and,
            // depending on how columns are populated elsewhere, exposing)
            // a foreign item. Only ids already present somewhere on this
            // board's own columns are valid — patchBoardCols is for
            // reordering existing items, never introducing new ones.
            const boardColumnDocs = await Column.find({_id: {$in: board.columns}})
            const boardItemIds = new Set(
              boardColumnDocs.flatMap((c) => c.items.map((id) => id.toString()))
            )
            const hasUnrelatedItem = requestedColumnIds.some((key) =>
              boardCols[key].items.some((i) => !boardItemIds.has(i.id))
            )

            if (hasUnrelatedItem) {
              status = axios.HttpStatusCode.Forbidden
              message = 'One or more items do not belong to this board'
            } else {
              try {
                // Was a bare `forEach` firing off unawaited `.then()`
                // calls: the response could be sent before the writes
                // actually finished, any rejection became an unhandled
                // promise rejection instead of a caught error, and —
                // since nothing was awaited — the transaction was never
                // committed nor aborted either.
                //
                // Sequential `for` loop rather than `Promise.all`: a
                // single ClientSession isn't safe for concurrent
                // operations — if one column's lookup/save were still in
                // flight on `dbSession` when another column's failure
                // triggered runInTransaction's abortTransaction() call,
                // that abort would race the in-flight operation on the
                // same session.
                await runInTransaction(async (dbSession) => {
                  for (const key of requestedColumnIds) {
                    // .session(dbSession): without it this read isn't
                    // part of the transaction's consistent snapshot, and
                    // a concurrent update to this same column between
                    // this read and the save() below could get silently
                    // overwritten (a lost update).
                    const column = await Column.findById(key).session(dbSession)
                    const ids = boardCols[key].items.map((i) => i.id)
                    column.items = ids
                    await column.save({session: dbSession})
                  }
                })
              } catch (e) {
                // A static message, not e.message: the neighboring
                // controls all return a fixed string on error rather than
                // forwarding raw Mongo/Mongoose exception text, which can
                // include internal driver/schema details that shouldn't
                // reach an API client. console.log(e) still gets the full
                // error into the server logs for debugging.
                console.log(e)
                status = axios.HttpStatusCode.InternalServerError
                message = 'Error updating columns'
              }
            }
          }
        } else {
          status = axios.HttpStatusCode.Unauthorized
          message = 'You do not have authorization to change the project and board do not match'
        }
      } else {
        status = axios.HttpStatusCode.Unauthorized
        message = 'You do not have authorization to change the project not leader'
      }
    } else {
      status = axios.HttpStatusCode.NotFound
      message = 'Project no found'
    }
  } else {
    status = axios.HttpStatusCode.Unauthorized
    message = 'You must be logged in.'
  }

  await db.disconnect()

  res.status(status).json({
    message,
    board,
  })
  return
}

export default patchBoardCols
