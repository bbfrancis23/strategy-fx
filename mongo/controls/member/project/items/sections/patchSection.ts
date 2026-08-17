import db from '@/mongo/db'
import {ObjectId} from 'mongodb'
import {getServerSession} from 'next-auth/next'
import {authOptions} from '@/pages/api/auth/[...nextauth]'

import Checkbox from '@/mongo/schemas/CheckboxSchema'
import axios from 'axios'
import mongoose from 'mongoose'

import Item from '@/mongo/schemas/ItemSchema'
import {Item as ItemInterface} from '@/react/item'
import Section from '@/mongo/schemas/SectionSchema'

import SectionType from '@/mongo/schemas/SectionTypeSchema'

import {PermissionCodes, permission} from '@/fx/ui/PermissionComponent'

import {findItem} from '@/mongo/controls/member/project/items/findItem'

import {SectionTypes} from '@/react/section'
import {NextApiRequest, NextApiResponse} from 'next'
import {
  forbiddenResponse,
  notFoundResponse,
  serverErrRes,
  unauthorizedResponse,
} from '@/mongo/controls/responses'

/* eslint-disable */

export const patchSection = async (req: NextApiRequest, res: NextApiResponse) => {
  const {sectionId} = req.query

  const authSession = await getServerSession(req, res, authOptions)

  await db.connect()

  if (!authSession) {
    unauthorizedResponse(res, 'You are not logged in')
    return
  }

  let section = await Section.findById(sectionId).populate({
    path: 'sectiontype',
    model: SectionType,
  })

  if (!section) {
    notFoundResponse(res, 'Section not found')
    return
  }

  let item = await Item.findById(section.itemid)
  if (!item) {
    notFoundResponse(res, 'Item not found')
    return
  }

  let feItem = await JSON.stringify(item)
  feItem = await JSON.parse(feItem)

  const hasPermission = permission({
    code: PermissionCodes.ITEM_OWNER,
    member: {id: authSession.user.id, email: 'grot@grot.com'},
    item: feItem as unknown as ItemInterface,
  })

  if (!hasPermission) {
    forbiddenResponse(res, 'You do not have permission to edit this project')
    return
  }

  const {CHECKLIST} = SectionTypes
  const {sectiontype, content, label, checkboxes} = req.body

  if (sectiontype === CHECKLIST && label) {
    const dbSession = await mongoose.startSession()
    try {
      dbSession.startTransaction()

      const newCheckbox = new Checkbox({
        label,
        order: 1,
      })

      await newCheckbox.save({dbSession})
      await section.checkboxes.push(newCheckbox)

      await section.save({dbSession})
      await dbSession.commitTransaction()
      item = await findItem(section.itemid)
    } catch (e) {
      console.log('error', e)
      await dbSession.abortTransaction()
      await dbSession.endSession()
      return serverErrRes(res, 'Error updating section')
    }

    await db.disconnect()
    return res.status(axios.HttpStatusCode.Created).json({
      message: 'Section was updated',
      item,
    })
  }

  if (sectiontype === CHECKLIST && checkboxes) {
    section.checkboxes = checkboxes
  }

  if (content) {
    section.content = content
  }

  try {
    await section.save()
    item = await findItem(section.itemid)
  } catch (e) {
    console.log('error', e)
    return serverErrRes(res, 'Error updating section')
  }
  await db.disconnect()
  res.status(axios.HttpStatusCode.Ok).json({
    message: 'Section Updated',
    item,
  })
}

// export const patchSection = async (req: NextApiRequest, res: NextApiResponse) => {
//   const {sectionId} = req.query
//   let status = axios.HttpStatusCode.Ok
//   let message = ''
//   let item = undefined
//   let section = undefined

//   const authSession = await getServerSession(req, res, authOptions)
//   await db.connect()

//   if (authSession) {
//     try {
//       section = await Section.findById(sectionId).populate({
//         path: 'sectiontype',
//         model: SectionType,
//       })
//     } catch (e) {
//       status = axios.HttpStatusCode.InternalServerError
//       message = e
//     }

//     if (section) {
//       try {
//         item = await Item.findById(section.itemid)
//       } catch (e) {
//         status = axios.HttpStatusCode.InternalServerError
//         message = e
//       }
//       if (item) {
//         let feItem = await JSON.stringify(item)
//         feItem = await JSON.parse(feItem)

//         const hasPermission = permission({
//           code: PermissionCodes.ITEM_OWNER,
//           member: {id: authSession.user.id},
//           item: feItem,
//         })

//         if (hasPermission) {
//           const {sectiontype, content, label, checkboxes} = req.body

//           if (sectiontype) {
//             section.sectiontype = sectiontype
//           }
//           if (content) {
//             section.content = content
//           }

//           const {CODE, TEXT, CHECKLIST} = SectionTypes
//           if (sectiontype === CHECKLIST && label) {
//             const newCheckbox = new Checkbox({
//               label,
//               order: 1,
//             })

//             try {
//               const dbSession = await mongoose.startSession()
//               dbSession.startTransaction()
//               await newCheckbox.save({dbSession})
//               await section.checkboxes.push(newCheckbox)
//               await section.save({dbSession})
//               item = await findItem(section.itemid)
//               await dbSession.commitTransaction()
//             } catch (e) {
//               status = axios.HttpStatusCode.InternalServerError
//               message = e
//               console.log('error', e)
//             }
//           } else if (sectiontype === CHECKLIST && checkboxes) {
//             section.checkboxes = checkboxes
//             try {
//               await section.save()
//               item = await findItem(section.itemid)
//             } catch (e) {
//               status = axios.HttpStatusCode.InternalServerError
//               message = e
//             }
//           } else {
//             try {
//               await section.save()
//               item = await findItem(section.itemid)
//             } catch (e) {
//               status = axios.HttpStatusCode.InternalServerError
//               message = e
//             }
//           }
//         } else {
//           status = axios.HttpStatusCode.Unauthorized
//           message = 'You do not have Authorization.'
//         }
//       }
//     } else {
//       status = axios.HttpStatusCode.NotFound
//       message = 'Section Not found'
//     }
//   } else {
//     status = axios.HttpStatusCode.Unauthorized
//     message = 'Authentication Required.'
//   }

//   await db.disconnect()
//   res.status(status).json({
//     message,
//     item,
//   })
// }
