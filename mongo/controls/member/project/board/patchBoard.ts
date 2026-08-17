import db from '@/mongo/db'

import {getServerSession} from 'next-auth/next'
import {authOptions} from '@/pages/api/auth/[...nextauth]'

import Project from '@/mongo/schemas/ProjectSchema'
import Board from '@/mongo/schemas/BoardSchema'

import axios from 'axios'
import {NextApiRequest, NextApiResponse} from 'next'
import {PatchBoardResponse} from '@/pages/api/members/projects/[projectId]/boards/boardsIdHandler'
import {
  forbiddenResponse,
  internalServerErrorResponse,
  notFoundResponse,
  unauthorizedResponse,
} from '@/mongo/controls/responses'

export const patchBoard = async (req: NextApiRequest, res: NextApiResponse<PatchBoardResponse>) => {
  const {projectId, boardId} = req.query

  const authSession = await getServerSession(req, res, authOptions)
  await db.connect()

  if (!authSession) {
    unauthorizedResponse(res, 'You are not logged in')
    return
  }

  const project = await Project.findById(projectId)

  if (!project) {
    notFoundResponse(res, 'Project not found')
    return
  }

  const castSession: any = authSession

  if (project.leader._id.toString() !== castSession.user.id) {
    forbiddenResponse(res, 'You do not have permission to edit this board')
    return
  }

  let board = await Board.findById(boardId)

  if (!board) {
    notFoundResponse(res, 'Board not found')
    return
  }

  if (board.project.toString() !== projectId) {
    forbiddenResponse(
      res,
      'You do not have authorization to change the project and board do not match',
    )
    return
  }

  if (req.method === 'DELETE') {
    board.archive = true
  } else if (req.body.title) {
    const {title} = req.body
    board.title = title
  } else if (req.body.columns) {
    board.columns = req.body.columns
  } else if (req.body.scope) {
    board.scope = req.body.scope
  }

  try {
    await board.save()
    board = await Board.findById(boardId)
    board = await board.toObject({getters: true})
  } catch (e) {
    console.error(e)
    internalServerErrorResponse(res, 'Error saving board')
    return
  }

  await db.disconnect()

  return res.status(axios.HttpStatusCode.Ok).json({
    message: 'Board was updated',
    board,
  })
}

// QA: Brian Francis 8-13-23
