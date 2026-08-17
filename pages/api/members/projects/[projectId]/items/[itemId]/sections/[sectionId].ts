import {patchSection} from '@/mongo/controls/member/project/items/sections/patchSection'
import {deleteSection} from '@/mongo/controls/member/project/items/sections/deleteSection'
import {NextApiRequest, NextApiResponse} from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'PATCH') {
    await patchSection(req, res)
    return
  } else if (req.method === 'DELETE') {
    await deleteSection(req, res)
    return
  }
}
