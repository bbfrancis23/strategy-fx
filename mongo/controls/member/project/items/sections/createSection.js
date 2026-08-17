import db from '@/mongo/db'
import {ObjectId} from 'mongodb'
import {getServerSession} from 'next-auth/next'
import {authOptions} from '@/pages/api/auth/[...nextauth]'
import axios from 'axios'
import mongoose from 'mongoose'

import Item from '@/mongo/schemas/ItemSchema'
import Section from '@/mongo/schemas/SectionSchema'

import {findItem} from '../findItem'

import {PermissionCodes, permission} from '@/fx/ui/PermissionComponent'

export const createSection = async (req, res) => {
  const {sectiontype, content} = req.body

  let item = undefined
  let status = axios.HttpStatusCode.Ok
  let message = ''

  const authSession = await getServerSession(req, res, authOptions)
  await db.connect()

  if (authSession) {
    try {
      item = await Item.findById(req.query.itemId).populate({
        path: 'sections',
        model: Section,
      })
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
        const newSection = new Section({
          sectiontype,
          content,
          order: 1,
          itemid: req.query.itemId,
        })

        try {
          const dbSession = await mongoose.startSession()
          dbSession.startTransaction()
          await newSection.save({dbSession})
          await item.sections.push(newSection)
          await item.save({dbSession})

          await dbSession.commitTransaction()
        } catch (e) {
          status = axios.HttpStatusCode.InternalServerError
          message = e
          console.log('error', e)
        }

        item = await findItem(req.query.itemId)
      } else {
        status = axios.HttpStatusCode.Unauthorized
        message = 'You do not have Authorization.'
      }
    } else {
      status = axios.HttpStatusCode.NotFound
      message = 'Item does not exist'
    }
  } else {
    status = axios.HttpStatusCode.Unauthorized
    message = 'Authentication Required.'
  }
  await db.disconnect()

  res.status(status).json({
    message,
    item,
  })
  return
}
