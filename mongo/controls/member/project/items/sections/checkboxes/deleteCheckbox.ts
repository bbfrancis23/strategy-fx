import db from '@/mongo/db'
import mongoose from 'mongoose'
import {NextApiRequest, NextApiResponse} from 'next'
import {getServerSession} from 'next-auth'
import {authOptions} from '@/pages/api/auth/[...nextauth]'
import axios from 'axios'
import {serverErrRes, notFoundRes, unauthRes} from '@/mongo/controls/responses'
import Item from '@/mongo/schemas/ItemSchema'
import Section from '@/mongo/schemas/SectionSchema'
import Checkbox from '@/mongo/schemas/CheckboxSchema'
import {PermissionCodes, permission} from '@/fx/ui'
import {findItem} from '@/mongo/controls/member/project/items/findItem'

export const deleteCheckbox = async (req: NextApiRequest, res: NextApiResponse) => {
  const {itemId, checkboxId, sectionId} = req.query

  const authSession = await getServerSession(req, res, authOptions)
  await db.connect()
  if (!authSession) return unauthRes(res, 'You are not logged in')
  let item = await Item.findById(itemId)

  if (!item) return notFoundRes(res, 'Item not found')

  let feItem: any = await JSON.stringify(item)
  feItem = await JSON.parse(feItem)

  const hasPermission = permission({
    code: PermissionCodes.ITEM_OWNER,
    member: {id: authSession.user.id, email: 'grot@grot.com'},
    item: feItem,
  })

  if (!hasPermission) return unauthRes(res, 'You do not have permission to delete this checkbox')
  let checkbox = await Checkbox.findById(checkboxId)
  if (!checkbox) return notFoundRes(res, 'Checkbox not found')

  const section = await Section.findById(sectionId)
  if (!section) return notFoundRes(res, 'Section not found')

  // itemId/sectionId/checkboxId are otherwise trusted independently —
  // without this, an owner of *some* item could pass their own real
  // itemId alongside an unrelated section/checkbox belonging to a
  // different item/project. Same class of gap fixed in deleteComment.ts
  // (commit 7204b7e).
  if (section.itemid?.toString() !== item._id.toString()) {
    return notFoundRes(res, 'Section not found')
  }
  if (!section.checkboxes.some((id: mongoose.Types.ObjectId) => id.toString() === checkbox._id.toString())) {
    return notFoundRes(res, 'Checkbox not found')
  }

  let dbSession: mongoose.ClientSession | undefined
  try {
    dbSession = await mongoose.startSession()
    dbSession.startTransaction()
    await Checkbox.deleteOne({_id: checkboxId}, {session: dbSession})
    await section.checkboxes.pull(checkbox)
    await section.save({session: dbSession})
    await dbSession.commitTransaction()
    dbSession.endSession()
  } catch (e) {
    // Guard with inTransaction(): if the failure happens after
    // commitTransaction() already succeeded (e.g. the re-fetch below did,
    // back when it lived inside this try), calling abortTransaction() on
    // an already-committed session throws ("Cannot call abortTransaction
    // after calling commitTransaction") — uncaught, which would skip
    // serverErrRes() entirely and leave the request with no response at
    // all, worse than the bug this catch block exists to handle.
    if (dbSession?.inTransaction()) {
      await dbSession.abortTransaction()
    }
    dbSession?.endSession()
    console.log(e)
    serverErrRes(res, 'Error deleting checkbox')
    return
  }

  item = await findItem(section.itemid)
  await db.disconnect()
  res.status(axios.HttpStatusCode.Ok).json({
    message: 'Checkbox was deleted',
    item,
  })
}
