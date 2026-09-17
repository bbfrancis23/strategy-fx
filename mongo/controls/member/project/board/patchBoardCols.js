import db from '@/mongo/db'
import {getServerSession} from 'next-auth/next'
import {authOptions} from '@/pages/api/auth/[...nextauth]'

import Project from '@/mongo/schemas/ProjectSchema'
import Board from '@/mongo/schemas/BoardSchema'

import Column from '/mongo/schemas/ColumnSchema'
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
            try {
              // Was a bare `forEach` firing off unawaited `.then()` calls:
              // the response could be sent before the writes actually
              // finished, any rejection became an unhandled promise
              // rejection instead of a caught error, and — since nothing
              // was awaited — the transaction was never committed nor
              // aborted either.
              //
              // Sequential `for` loop rather than `Promise.all`: a single
              // ClientSession isn't safe for concurrent operations — if
              // one column's lookup/save were still in flight on
              // `dbSession` when another column's failure triggered
              // runInTransaction's abortTransaction() call, that abort
              // would race the in-flight operation on the same session.
              await runInTransaction(async (dbSession) => {
                for (const key of requestedColumnIds) {
                  const column = await Column.findById(key)
                  const ids = boardCols[key].items.map((i) => i.id)
                  column.items = ids
                  await column.save({session: dbSession})
                }
              })
            } catch (e) {
              // e.message, not e: an Error's own properties (message,
              // stack) are non-enumerable, so JSON.stringify(e) — which
              // res.json() does — serializes to "{}", silently losing the
              // error entirely at the response level even though it was
              // properly caught. console.log(e) still gets the full
              // object into the server logs.
              console.log(e)
              status = axios.HttpStatusCode.InternalServerError
              message = e.message || 'Error updating columns'
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
