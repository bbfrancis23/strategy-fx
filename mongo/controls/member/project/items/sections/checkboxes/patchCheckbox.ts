import db from '@/mongo/db'
import {NextApiRequest, NextApiResponse} from 'next/types'
import {getServerSession} from 'next-auth/next'
import {authOptions} from '@/pages/api/auth/[...nextauth]'
import {findItem} from '@/mongo/controls/member/project/items/findItem'
import axios from 'axios'
import {findProject} from '@/mongo/controls/project/projectControls'
import {serverErrRes, notFoundRes, unauthRes} from '@/mongo/controls/responses'
import Item from '@/mongo/schemas/ItemSchema'
import Section from '@/mongo/schemas/SectionSchema'
import SectionType from '@/mongo/schemas/SectionTypeSchema'
import Checkbox from '@/mongo/schemas/CheckboxSchema'
import {PermissionCodes, permission} from '@/fx/ui/PermissionComponent'
import {SectionTypes} from '@/react/section'

export const patchCheckbox = async (req: NextApiRequest, res: NextApiResponse) => {
  const {itemId, sectionId, projectId, checkboxId} = req.query
  const {value, label} = req.body

  const authSession = await getServerSession(req, res, authOptions)
  await db.connect()
  if (!authSession) return unauthRes(res, 'You have not been Authenticated')

  let item = null
  try {
    item = await Item.findById(itemId)
  } catch (e) {
    return serverErrRes(res, 'Error finding item')
  }

  if (!item) return notFoundRes(res, 'Item not found')
  if (!projectId) return notFoundRes(res, 'Project not found')
  const project = await findProject(projectId as string)
  await db.connect()
  if (!project) return notFoundRes(res, 'Project not found')
  item = JSON.parse(JSON.stringify(item))

  let hasPermission = false

  if (label) {
    hasPermission = permission({
      code: PermissionCodes.ITEM_OWNER,
      member: {id: authSession.user.id, email: 'grot@grot.com'},
      item,
    })
  }

  if (value === true || value === false) {
    hasPermission = permission({
      code: PermissionCodes.PROJECT_MEMBER,
      member: {id: authSession.user.id, email: 'grot@grot.com'},
      project,
    })
  }
  let section = null
  try {
    section = await Section.findById(sectionId).populate({
      path: 'sectiontype',
      model: SectionType,
    })
  } catch (e) {
    return serverErrRes(res, 'Error finding section')
  }

  const {CHECKLIST} = SectionTypes

  if (!section || section.sectiontype.id !== CHECKLIST)
    return notFoundRes(res, 'Section is not a checklist')

  if (!hasPermission) return unauthRes(res, 'You do not have permission to edit this ')

  let checkbox = await Checkbox.findById(checkboxId)
  if (!checkbox) notFoundRes(res, 'Checkbox not found')

  if (label) checkbox.label = label

  if (value === true || value === false) checkbox.value = value

  try {
    await checkbox.save()
    item = await findItem(section.itemid)
  } catch (e) {
    console.log(e)
    serverErrRes(res, 'Error patching checkbox')
    return
  }

  await db.disconnect()
  res.status(axios.HttpStatusCode.Ok).json({
    message: 'Checkbox was updated was saved',
    item,
  })
}
