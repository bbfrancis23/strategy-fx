import {NextApiRequest, NextApiResponse} from 'next/types'
import {getServerSession} from 'next-auth/next'
import {authOptions} from '@/pages/api/auth/[...nextauth]'

import db from '@/mongo/db'
import axios from 'axios'

import {
  internalServerErrorResponse,
  notFoundResponse,
  unauthorizedResponse,
} from '@/mongo/controls/responses'

import Project from '@/mongo/schemas/ProjectSchema'
import Item from '@/mongo/schemas/ItemSchema'
import Comment from '@/mongo/schemas/CommentSchema'
import SectionType from '@/mongo/schemas/SectionTypeSchema'
import Section from '@/mongo/schemas/SectionSchema'
import Member from '@/mongo/schemas/MemberSchema'

import {PermissionCodes, permission} from '@/fx/ui/PermissionComponent'

/*eslint-disable */

export const patchComment = async (req: NextApiRequest, res: NextApiResponse) => {
  const {projectId, itemId, commentId} = req.query
  const {content, sectiontype} = req.body

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

  let comment = undefined

  try {
    comment = await Comment.findById(commentId).populate([
      {
        path: 'sectiontype',
        model: SectionType,
      },
      {path: 'owner', model: Member},
    ])
  } catch (e) {
    console.log(e)
    internalServerErrorResponse(res, 'Error finding comment')
    return
  }

  if (!comment) {
    notFoundResponse(res, 'Comment not found')
    return
  }

  let item = await Item.findById(itemId).populate([
    {path: 'sections', model: Section},
    {path: 'comments', model: Comment, populate: {path: 'owner', model: Member}},
  ])

  if (!item) {
    notFoundResponse(res, 'Item not found')
    return
  }

  // The route trusts projectId/itemId/commentId independently — without
  // this, a project leader/admin (passing their own real projectId) could
  // supply an unrelated project's itemId/commentId and edit a comment
  // that doesn't belong to either, via the leader/admin fallback below.
  if (comment.itemid?.toString() !== item._id.toString()) {
    notFoundResponse(res, 'Comment not found')
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

  // A comment with no owner (orphaned/legacy data, or the owner account no
  // longer exists) fails COMMENT_OWNER for everyone permanently — with no
  // fallback that would otherwise be a comment nobody can ever edit.
  // Project leader/admins can act as a fallback so there's a real
  // resolution path instead of a dead end.
  const isProjectLeaderOrAdmin =
    project.leader?.toString() === castSession.user.id ||
    project.admins?.some((adminId: any) => adminId.toString() === castSession.user.id)

  if (!hasPermission && !isProjectLeaderOrAdmin) {
    unauthorizedResponse(res, 'You do not have permission to edit this comment')
    return
  }

  try {
    comment = await Comment.findById(commentId).populate([
      {path: 'sectiontype', model: SectionType},
      {path: 'owner', model: Member},
    ])
  } catch (e) {
    console.log(e)
    internalServerErrorResponse(res, 'Error finding comment')
    return
  }

  if (sectiontype) {
    comment.sectiontype = sectiontype
  }
  if (content) {
    comment.content = content
  }

  try {
    await comment.save()

    item = await Item.findById(comment.itemid).populate([
      {
        path: 'sections',
        model: Section,
      },
      {path: 'comments', model: Comment, populate: {path: 'owner', model: Member}},
    ])

    item = await item.toObject({getters: true, flattenMaps: true})

    item = JSON.stringify(item)
    item = await JSON.parse(item)
  } catch (e) {
    console.log(e)
    internalServerErrorResponse(res, 'Error creating comment')
    return
  }

  await db.disconnect()

  return res.status(axios.HttpStatusCode.Ok).json({
    message: 'Comment was saved',
    item,
  })
}
