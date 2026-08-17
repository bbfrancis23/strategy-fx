import {createSection} from '@/mongo/controls/member/project/items/sections/createSection'

export const handler = async (req, res) => {
  if (req.method === 'POST') {
    await createSection(req, res)
    return
  }
}
export default handler
