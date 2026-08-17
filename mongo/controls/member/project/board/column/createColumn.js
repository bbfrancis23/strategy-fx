import axios from 'axios'
import db from '@/mongo/db'

import Project from '@/mongo/schemas/ProjectSchema'
import Board from '@/mongo/schemas/BoardSchema'
import Column from '@/mongo/schemas/ColumnSchema'

import {getServerSession} from 'next-auth/next'
import {authOptions} from '@/pages/api/auth/[...nextauth]'
import mongoose from 'mongoose'

import findPublicBoard from '../findPublicBoard'

export const createColumn = async (req, res) => {
  let status = axios.HttpStatusCode.Ok
  let message = ''
  let board = undefined

  const authSession = await getServerSession(req, res, authOptions)
  await db.connect()

  if (req.body.title) {
    const {title} = req.body

    if (authSession) {
      const {projectId} = req.query

      const project = await Project.findOne({_id: projectId})

      if (authSession.user.id === project.leader.toString()) {
        board = await Board.findOne({_id: req.query.boardId})

        if (board) {
          const dbSession = await mongoose.startSession()

          try {
            dbSession.startTransaction()

            const newColumn = new Column({title})

            await newColumn.save({dbSession})
            await board.columns.push(newColumn)

            await board.save({dbSession})
            await dbSession.commitTransaction()

            status = axios.HttpStatusCode.Created

            board = await Board.findOne({_id: board._id})
          } catch (e) {
            await dbSession.abortTransaction()
            dbSession.endSession()
            status = axios.HttpStatusCode.InternalServerError
            message = e
          }

          if (status === axios.HttpStatusCode.Created) {
            board = await Board.findById(board._id).populate({
              path: 'columns',
              model: Column,
            })

            // board = await board.toObject({getters: true})
            board = await findPublicBoard(req.query.boardId)
          }
        } else {
          status = axios.HttpStatusCode.NotFound
          message = 'The board does not exsist'
        }
      } else {
        status = axios.HttpStatusCode.Forbidden
        message = 'You must be the Project Leader or Admin to create a Board'
      }
    } else {
      status = axios.HttpStatusCode.Unauthorized
      message = 'Authentication Required.'
    }
  } else {
    status = axios.HttpStatusCode.NoContent
    message = 'Board Title is undefined'
  }

  await db.disconnect()
  res.status(status).json({
    message,
    board,
  })
  return
}

// ENHANCEMENTS: Change to typeScript, Remove nesting, use Responses
