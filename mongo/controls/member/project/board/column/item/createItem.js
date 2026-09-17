import axios from 'axios'
import db from '@/mongo/db'

import Project from '@/mongo/schemas/ProjectSchema'
import Column from '@/mongo/schemas/ColumnSchema'
import Item from '@/mongo/schemas/ItemSchema'
import Member from '@/mongo/schemas/MemberSchema'

import {getServerSession} from 'next-auth/next'
import {authOptions} from '@/pages/api/auth/[...nextauth]'

import {PermissionCodes, permission} from '@/fx/ui/PermissionComponent'

import findPublicBoard from '@/mongo/controls/member/project/board/findPublicBoard'
import {runInTransaction} from '@/mongo/controls/runInTransaction'

export const createItem = async (req, res) => {
  let status = axios.HttpStatusCode.Created
  let message = ''
  let board = undefined

  const authSession = await getServerSession(req, res, authOptions)
  await db.connect()

  if (authSession) {
    const {projectId} = req.query

    const project = await Project.findOne({_id: req.query.projectId})
      .populate({path: 'leader', model: Member})
      .populate({path: 'admins', model: Member})
      .populate({path: 'members', model: Member})

    let frontEndProjectFormat = await project.toObject({
      getters: true,
      flattenMaps: true,
    })

    frontEndProjectFormat = await JSON.stringify(frontEndProjectFormat)
    frontEndProjectFormat = await JSON.parse(frontEndProjectFormat)

    const hasPermission = permission({
      code: PermissionCodes.PROJECT_ADMIN,
      member: {id: authSession.user.id},
      project: frontEndProjectFormat,
    })

    if (hasPermission) {
      // findPublicBoard (not a shallow Board.findOne(...).populate('columns'))
      // so this doubles as a properly-shaped fallback if the post-commit
      // refresh below fails: it deep-populates columns -> items ->
      // sections -> checkboxes, matching what the client actually expects
      // a Board/Column to look like. A shallow populate here previously
      // left each column's `items` as raw ObjectIds — not a valid
      // fallback shape, since BoardColumn/ColumnList render each item as
      // a full object.
      board = await findPublicBoard(req.query.boardId)

      // findPublicBoard() disconnects internally when it finishes (see
      // mongo/db.js — a real disconnect in production, a no-op under
      // Jest's NODE_ENV=test, which is exactly why this didn't show up
      // in tests). Reconnect before the transaction below needs the
      // connection — without this, mongoose.startSession() and every
      // subsequent query fails with MongoNotConnectedError in production,
      // the same bug class #421 was about, reintroduced here by routing
      // this pre-transaction fetch through findPublicBoard().
      await db.connect()

      if (!board) {
        status = axios.HttpStatusCode.NotFound
        message = 'Board not found'
      } else if (board.project.toString() === projectId) {
        let column = board.columns.find((c) => c.id === req.query.columnId)

        if (column) {
          const columnId = column._id

          try {
            await runInTransaction(async (dbSession) => {
              const newItem = new Item({
                title: req.body.title,
                owners: [authSession.user.id],
                scope: 'private',
              })
              await newItem.save({session: dbSession})

              // Re-fetched here rather than reusing the outer `column`
              // (populated before the transaction started): saving that
              // one would write back a document read outside the
              // transaction's consistent snapshot, so a concurrent
              // update to this same column between that read and this
              // save could get silently overwritten — the exact lost-
              // update bug patchBoardCols.js was fixed for.
              const sessionColumn = await Column.findById(columnId).session(dbSession)
              sessionColumn.items.push(newItem)
              await sessionColumn.save({session: dbSession})
            })
          } catch (e) {
            console.log(e)
            status = axios.HttpStatusCode.InternalServerError
            message = 'Error creating item'
          }

          // Separate try/catch: the transaction above already committed,
          // so a failure here must not touch it. Deliberately does NOT
          // turn into a 500: the item was already saved successfully, and
          // CreateItemForm.tsx only treats a 201 response as success —
          // reporting failure here would make the client retry and
          // create a duplicate item. `board` is only reassigned when the
          // refresh actually returns something: findPublicBoard can fail
          // two different ways — throwing, or resolving to `null` (e.g.
          // if the board's archive flag flipped in the moment between
          // requests) — and only guarding the throw would let a null
          // result silently overwrite the still-good pre-transaction
          // `board` with null, which the client would then treat as a
          // valid response and crash on. Keeping the pre-transaction
          // board (stale — won't yet include the new item, but a
          // properly-shaped, valid object) is the least-bad fallback
          // either way; still logged server-side so this rare case is
          // visible for debugging.
          if (status === axios.HttpStatusCode.Created) {
            try {
              const refreshedBoard = await findPublicBoard(req.query.boardId)
              if (refreshedBoard) {
                board = refreshedBoard
              }
            } catch (e) {
              console.log(e)
            }
          }
        } else {
          status = axios.HttpStatusCode.Forbidden
          message = 'Data is mismatched this is a hacking attempt'
        }
      } else {
        status = axios.HttpStatusCode.Forbidden
        message = 'Data is mismatched this is a hacking attempt'
      }
    } else {
      status = axios.HttpStatusCode.Forbidden
      message = 'You must be the Project Leader or Admin to create a Board'
    }
  } else {
    status = axios.HttpStatusCode.Unauthorized
    message = 'Authentication Required.'
  }
  await db.disconnect()
  res.status(status).json({
    message,
    board,
  })
}

export default createItem
