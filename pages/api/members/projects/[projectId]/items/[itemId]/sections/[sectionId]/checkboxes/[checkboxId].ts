import {
  patchCheckbox,
} from '@/mongo/controls/member/project/items/sections/checkboxes/patchCheckbox'
import {
  deleteCheckbox,
} from '@/mongo/controls/member/project/items/sections/checkboxes/deleteCheckbox'
import {NextApiRequest, NextApiResponse} from 'next/types'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'PATCH') {
    await patchCheckbox(req, res)
    return
  } else if (req.method === 'DELETE') {
    await deleteCheckbox(req, res)
    return
  }
}
