import {Item} from '@/react/item/item-types'
import {findItem} from '@/mongo/controls/member/project/items/findItem'
import getItem from '@/mongo/controls/member/project/items/getItem'
import {patchItem} from '@/mongo/controls/member/project/items/patchItem'
import {NextApiRequest, NextApiResponse} from 'next'

export const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const {itemId} = req.query
  if (req.method === 'GET') {
    await getItem(req, res)
    return
  } else if (req.method === 'PATCH') {
    await patchItem(req, res)
    return
  } else if (req.method === 'DELETE') {
    await patchItem(req, res)
    return
  }
}

export default handler
