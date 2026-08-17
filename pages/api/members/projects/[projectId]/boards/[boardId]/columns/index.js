import {createColumn} from '@/mongo/controls/member/project/board/column/createColumn'

const handler = async (req, res) => {
  if (req.method === 'POST') {
    await createColumn(req, res)
    return
  }
  return
}

export default handler
