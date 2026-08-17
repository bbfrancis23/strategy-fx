import db from '@/mongo/db'
import axios from 'axios'
import mongoose from 'mongoose'
import {getServerSession} from 'next-auth/next'
import {authOptions} from '@/pages/api/auth/[...nextauth]'
import {NextApiRequest, NextApiResponse} from 'next/types'
import {serverErrRes, notFoundRes, unauthRes} from '@/mongo/controls/responses'
import Project from '@/mongo/schemas/ProjectSchema'
import Item from '@/mongo/schemas/ItemSchema'
import Comment from '@/mongo/schemas/CommentSchema'
import SectionType from '@/mongo/schemas/SectionTypeSchema'
import Section from '@/mongo/schemas/SectionSchema'
import Member from '@/mongo/schemas/MemberSchema'
import {PermissionCodes, permission} from '@/fx/ui/PermissionComponent'

export const deleteComment = async (req: NextApiRequest, res: NextApiResponse) => {
  const {projectId, itemId, commentId} = req.query

  const authSession = await getServerSession(req, res, authOptions)
  await db.connect()

  if (!authSession) {
    unauthRes(res, 'You are not logged in')
    return
  }

  const project = await Project.findById(projectId)

  if (!project) {
    notFoundRes(res, 'Project not found')
    return
  }

  let comment = undefined

  comment = await Comment.findById(commentId).populate([
    {
      path: 'sectiontype',
      model: SectionType,
    },
    {path: 'owner', model: Member},
  ])

  if (!comment) {
    notFoundRes(res, 'Comment not found')
    return
  }

  let item = await Item.findById(itemId).populate([
    {path: 'sections', model: Section},
    {path: 'comments', model: Comment, populate: {path: 'owner', model: Member}},
  ])

  if (!item) {
    notFoundRes(res, 'Item not found')
    return
  }

  comment = await comment.toObject({getters: true, flattenMaps: true})
  let feComment: any = JSON.stringify(comment)
  feComment = await JSON.parse(feComment)

  const castSession: any = authSession

  const hasPermission = permission({
    code: PermissionCodes.COMMENT_OWNER,
    member: {id: castSession.user.id, email: 'grot@grot.com'},
    comment: feComment,
  })

  if (!hasPermission) {
    unauthRes(res, 'You do not have permission to edit this comment')
    return
  }

  ///////////////////////

  const dbSession = await mongoose.startSession()
  try {
    dbSession.startTransaction()

    await Comment.deleteOne({_id: commentId})

    await item.comments.pull(comment)
    await item.save({dbSession})
    await dbSession.commitTransaction()

    dbSession.endSession()
  } catch (e) {
    await dbSession.abortTransaction()
    dbSession.endSession()
    console.log(e)
    serverErrRes(res, 'Error deleting section')
  }

  ////////////////////

  await db.disconnect()

  item = await Item.findById(itemId).populate([
    {path: 'sections', model: Section},
    {path: 'comments', model: Comment, populate: {path: 'owner', model: Member}},
  ])

  item = await item.toObject({getters: true, flattenMaps: true})

  item = JSON.stringify(item)
  item = await JSON.parse(item)

  return res.status(axios.HttpStatusCode.Ok).json({
    message: 'Comment was saved',
    item,
  })
}
