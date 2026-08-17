import axios from 'axios'
import db from '@/mongo/db'

import Project from '@/mongo/schemas/ProjectSchema'
import Board from '@/mongo/schemas/BoardSchema'
import Column from '@/mongo/schemas/ColumnSchema'
import Item from '@/mongo/schemas/ItemSchema'
import Member from '@/mongo/schemas/MemberSchema'

import {getServerSession} from 'next-auth/next'
import {authOptions} from '@/pages/api/auth/[...nextauth]'

import {PermissionCodes, permission} from '@/fx/ui/PermissionComponent'

import findPublicBoard from '@/mongo/controls/member/project/board/findPublicBoard'

import mongoose from 'mongoose'

export const createItem = async (req, res) => {
  let status = axios.HttpStatusCode.Created
  let message = ''
  let item = undefined
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
      board = await Board.findOne({_id: req.query.boardId}).populate({
        path: 'columns',
        model: Column,
      })

      if (board.project.toString() === projectId) {
        let column = board.columns.find((c) => c.id === req.query.columnId)

        if (column) {
          const dbSession = await mongoose.startSession()

          try {
            dbSession.startTransaction()

            const newItem = new Item({
              title: req.body.title,
              owners: [authSession.user.id],
              scope: 'private',
            })

            await newItem.save({dbSession})

            await column.items.push(newItem)

            await column.save({dbSession})
            await dbSession.commitTransaction()

            column = await column.toObject({getters: true})
            status = axios.HttpStatusCode.Created

            item = newItem.toObject({getters: true})

            // board = await Board.findOne({
            //   _id: req.query.boardId,
            //   project: req.query.projectId,
            // }).populate({
            //   path: 'columns',
            //   populate: {path: 'items', model: Item},
            // })

            // board = board.toObject({getters: true, flattenMaps: true})

            board = await findPublicBoard(req.query.boardId)
          } catch (e) {
            console.log('ERROR ERROR', e)

            await dbSession.abortTransaction()
            dbSession.endSession()

            console.log('there was an error', e)
            status = axios.HttpStatusCode.InternalServerError
            message = e
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
