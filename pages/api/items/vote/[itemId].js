import db from '@/mongo/db'
import Item from '@/mongo/schemas/ItemSchema'
import Section from '@/mongo/schemas/SectionSchema'

const processVote = async (item, vote, userId) => {
  item.upvotes = await item.upvotes.filter((v) => v !== userId)
  item.downvotes = await item.downvotes.filter((v) => v !== userId)

  if (vote === 'up') {
    await item.upvotes.push(userId)
  } else if (vote === 'down') {
    await item.downvotes.push(userId)
  }

  return item
}

export default function handler(req, res) {
  // const {itemId} = req.query
  // let status = 405
  // let message = 'Invalid Method'
  // let item = {}
  // await db.connect()

  // if (req.method === 'PATCH') {

  //   if (session) {
  //     try {
  //       item = await Item.findById(itemId).populate({
  //         path: 'sections',
  //         model: Section,
  //       })
  //     } catch (e) {
  //       status = 500
  //       message = `Server Error: ${e}`
  //     }

  //     if (item) {
  //       const {vote} = req.body

  //       if (vote) {
  //         if (vote === 'up' || vote === 'down' || vote === 'reset') {
  //           item = await processVote(item, vote, session.user.id)
  //           await item.save()

  //           item = await item.toObject({getters: true, flattenMaps: true})

  //           item = await flattenItem(item)

  //           status = 200
  //           message = 'Vote Registered'
  //         } else {
  //           status = 400
  //           message = 'Invalid Vote, please vote "up" or "down"'
  //         }
  //       } else {
  //         status = 400
  //         message = 'No vote field'
  //       }
  //     } else {
  //       status = 404
  //       message = 'Invalid Item'
  //     }
  //   } else {
  //     status = 403
  //     message = 'Permission Denied'
  //   }
  // }

  // await db.disconnect()
  // res.status(status).json({
  //   message,
  //   item,
  // })
  res.status(200).json({message: 'comming soon'})
}
