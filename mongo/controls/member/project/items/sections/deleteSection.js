import db from '@/mongo/db'
import {ObjectId} from 'mongodb'
import {getServerSession} from 'next-auth/next'
import {authOptions} from '@/pages/api/auth/[...nextauth]'
import axios from 'axios'
import mongoose from 'mongoose'

import Item from '@/mongo/schemas/ItemSchema'
import Section from '@/mongo/schemas/SectionSchema'

import SectionType from '@/mongo/schemas/SectionTypeSchema'

import {PermissionCodes, permission} from '@/fx/ui/PermissionComponent'
import {findItem} from '@/mongo/controls/member/project/items/findItem'

export const deleteSection = async (req, res) => {
  console.log('deleting section ')

  const {sectionId} = req.query

  let section = undefined
  let item = undefined
  let status = axios.HttpStatusCode.Ok
  let message = ''
  const authSession = await getServerSession(req, res, authOptions)
  await db.connect()

  console.log('authSession', authSession)

  if (authSession) {
    try {
      section = await Section.findById(sectionId).populate({
        path: 'sectiontype',
        model: SectionType,
      })
    } catch (e) {
      status = axios.HttpStatusCode.InternalServerError
      message = e
    }

    if (section) {
      try {
        item = await Item.findById(section.itemid)
      } catch (e) {
        status = axios.HttpStatusCode.InternalServerError
        message = e
      }

      if (item) {
        let feItem = await JSON.stringify(item)
        feItem = await JSON.parse(feItem)

        const hasPermission = permission({
          code: PermissionCodes.ITEM_OWNER,
          member: {id: authSession.user.id},
          item: feItem,
        })

        if (hasPermission) {
          const dbSession = await mongoose.startSession()
          try {
            dbSession.startTransaction()

            await Section.deleteOne({_id: ObjectId(sectionId)})

            await item.sections.pull(section)
            await item.save({dbSession})
            await dbSession.commitTransaction()
            item = await findItem(section.itemid)
            // item = await Item.findById(section.itemid).populate({
            //   path: 'sections',
            //   model: Section,
            // })
            dbSession.endSession()
          } catch (e) {
            await dbSession.abortTransaction()
            dbSession.endSession()
            status = axios.HttpStatusCode.InternalServerError
            message = e
            console.log(e)
          }
        } else {
          status = axios.HttpStatusCode.Unauthorized
          message = 'You do not have Authorization.'
        }
      } else {
        status = axios.HttpStatusCode.NotFound
      }
    }
  } else {
    status = axios.HttpStatusCode.Unauthorized
    message = 'Authentication Required.'
  }
  await db.disconnect()

  res.status(status).json({
    message,
    item: item ? item : undefined,
  })
  return
}
